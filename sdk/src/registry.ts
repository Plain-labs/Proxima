import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  Keypair,
} from '@stellar/stellar-sdk';
import type { SorobanRpc } from '@stellar/stellar-sdk';

import { ProximaError, ErrorCodes } from './types';
import type {
  Agent,
  FindAgentsParams,
  RegisterAgentParams,
} from './types';
import {
  ResolvedConfig,
  createRpcServer,
  createHorizonServer,
  toStroops,
  fromStroops,
  formatReputation,
} from './stellar';

/**
 * RegistryClient — interact with the Proxima Agent Registry contract.
 *
 * @example
 * ```ts
 * const registry = new RegistryClient(config)
 *
 * // Register a new agent
 * await registry.register({ id: 'my-agent', name: 'My Agent', ... }, keypair)
 *
 * // Find agents by capability
 * const agents = await registry.find({ capability: 'image-generation' })
 * ```
 */
export class RegistryClient {
  private rpc: SorobanRpc.Server;
  private contract: Contract;

  constructor(private config: ResolvedConfig) {
    this.rpc = createRpcServer(config);
    this.contract = new Contract(config.registryContractId);
  }

  // ─── Read Methods ───────────────────────────────────────────────────────────

  /**
   * Retrieve a single agent by ID.
   * @throws ProximaError if agent not found
   */
  async getAgent(id: string): Promise<Agent> {
    try {
      const result = await this.rpc.simulateTransaction(
        this._buildSimulation('get_agent', [nativeToScVal(id, { type: 'string' })])
      );

      if (SorobanRpc.Api.isSimulationError(result)) {
        throw new ProximaError(
          `Agent "${id}" not found`,
          ErrorCodes.AGENT_NOT_FOUND,
          result.error
        );
      }

      return this._parseAgent(scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval));
    } catch (err) {
      if (err instanceof ProximaError) throw err;
      throw new ProximaError(
        `Failed to fetch agent: ${(err as Error).message}`,
        ErrorCodes.NETWORK_ERROR,
        err
      );
    }
  }

  /**
   * Check if an agent ID is already registered.
   */
  async agentExists(id: string): Promise<boolean> {
    try {
      const result = await this.rpc.simulateTransaction(
        this._buildSimulation('agent_exists', [nativeToScVal(id, { type: 'string' })])
      );
      if (SorobanRpc.Api.isSimulationError(result)) return false;
      return scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval) as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Return total number of registered agents.
   */
  async agentCount(): Promise<bigint> {
    const result = await this.rpc.simulateTransaction(
      this._buildSimulation('agent_count', [])
    );
    if (SorobanRpc.Api.isSimulationError(result)) return 0n;
    return BigInt(scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval) as number);
  }

  /**
   * Find agents matching filter criteria.
   *
   * This method queries registered AgentRegistered events from the Stellar
   * Horizon API to discover all agent IDs, then fetches each agent's on-chain
   * data and filters by the provided criteria.
   *
   * For high-volume production use, pair this with a dedicated indexer
   * (e.g. Mercury, Subquery) for sub-second queries. See docs/SDK_GUIDE.md.
   *
   * @param params  Filter and sort criteria
   * @returns       Array of matching agents, sorted by reputation descending
   */
  async find(params: FindAgentsParams = {}): Promise<Agent[]> {
    const { capability, maxPrice, minReputation, activeOnly = true } = params;

    try {
      // Query Horizon for all AgentRegistered contract events emitted by the
      // registry contract. Each event payload is the agent ID.
      const horizon = createHorizonServer(this.config);

      // Fetch contract events for the registry — topic1="regist", topic2="agent"
      const eventsUrl =
        `${this.config.horizonUrl}/contract_events` +
        `?contract_id=${this.config.registryContractId}` +
        `&topic1=AAAADwAAAAZyZWdpc3Q=` +   // base64("regist") as ScSymbol
        `&topic2=AAAADwAAAAVhZ2VudA==` +   // base64("agent") as ScSymbol
        `&limit=200&order=asc`;

      let agentIds: string[] = [];

      try {
        const res = await fetch(eventsUrl);
        if (res.ok) {
          const data = await res.json() as { _embedded?: { records?: Array<{ value: string }> } };
          const records = data._embedded?.records ?? [];
          // Each event value is the agent_id encoded as ScVal string
          agentIds = records.map((r) => {
            try {
              return scValToNative(
                xdr.ScVal.fromXDR(r.value, 'base64')
              ) as string;
            } catch {
              return null;
            }
          }).filter((id): id is string => id !== null);
        }
      } catch {
        // Horizon unavailable — fall through to empty result
      }

      if (agentIds.length === 0) {
        return [];
      }

      // Deduplicate (an agent could have multiple register events if re-registered)
      const uniqueIds = [...new Set(agentIds)];

      // Fetch each agent in parallel (cap at 50 concurrent requests)
      const BATCH = 50;
      const agents: Agent[] = [];

      for (let i = 0; i < uniqueIds.length; i += BATCH) {
        const batch = uniqueIds.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((id) => this.getAgent(id))
        );
        for (const result of results) {
          if (result.status === 'fulfilled') {
            agents.push(result.value);
          }
        }
      }

      // Apply filters
      return agents
        .filter((agent) => {
          if (activeOnly && !agent.isActive) return false;
          if (capability && !agent.capabilities.includes(capability)) return false;
          if (minReputation !== undefined && agent.reputation / 100 < minReputation) return false;
          if (maxPrice !== undefined) {
            const maxStroops = toStroops(maxPrice);
            if (agent.pricePerCall > maxStroops) return false;
          }
          return true;
        })
        .sort((a, b) => b.reputation - a.reputation);
    } catch (err) {
      if (err instanceof ProximaError) throw err;
      throw new ProximaError(
        `find() failed: ${(err as Error).message}`,
        ErrorCodes.NETWORK_ERROR,
        err
      );
    }
  }

  // ─── Write Methods ──────────────────────────────────────────────────────────

  /**
   * Register a new AI agent in the Proxima registry.
   *
   * @param params  Agent registration parameters
   * @param keypair Stellar keypair of the agent owner
   * @returns       The registered agent ID
   */
  async register(params: RegisterAgentParams, keypair: Keypair): Promise<string> {
    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(params.id, { type: 'string' }),
      nativeToScVal(params.name, { type: 'string' }),
      nativeToScVal(params.description, { type: 'string' }),
      nativeToScVal(params.capabilities, { type: 'vec' }),
      nativeToScVal(toStroops(params.pricePerCall), { type: 'i128' }),
      nativeToScVal(params.paymentAsset, { type: 'string' }),
      nativeToScVal(params.paymentIssuer, { type: 'address' }),
      nativeToScVal(params.endpointUrl ?? '', { type: 'bytes' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('register', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);

    return params.id;
  }

  /**
   * Update an existing agent's metadata. Must be called by the agent owner.
   *
   * @param id      Agent ID to update
   * @param params  Fields to update (all required — pass current values for fields you don't want to change)
   * @param keypair Keypair of the agent owner
   */
  async updateAgent(
    id: string,
    params: {
      name: string;
      description: string;
      capabilities: string[];
      pricePerCall: string;
      isActive: boolean;
      endpointUrl?: string;
    },
    keypair: Keypair
  ): Promise<void> {
    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(id, { type: 'string' }),
      nativeToScVal(params.name, { type: 'string' }),
      nativeToScVal(params.description, { type: 'string' }),
      nativeToScVal(params.capabilities, { type: 'vec' }),
      nativeToScVal(toStroops(params.pricePerCall), { type: 'i128' }),
      nativeToScVal(params.isActive, { type: 'bool' }),
      nativeToScVal(params.endpointUrl ?? '', { type: 'bytes' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('update_agent', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);
  }

  /**
   * Submit a reputation rating for an agent after a completed interaction.
   * Rating must be between 0 and 10000 (representing 0.00% – 100.00%).
   *
   * @param id      Agent ID to rate
   * @param rating  Score 0–10000
   * @param keypair Keypair of the caller
   */
  async updateReputation(id: string, rating: number, keypair: Keypair): Promise<void> {
    if (rating < 0 || rating > 10000) {
      throw new ProximaError(
        'Rating must be between 0 and 10000',
        ErrorCodes.CONTRACT_ERROR
      );
    }

    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(id, { type: 'string' }),
      nativeToScVal(rating, { type: 'u32' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('update_reputation', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);
  }

  /**
   * Update an existing agent's metadata. Must be called by the original owner.
   *
   * @param id          Agent ID to update
   * @param updates     Fields to update (all required by the contract)
   * @param keypair     Keypair of the agent owner
   */
  async updateAgent(
    id: string,
    updates: {
      name: string;
      description: string;
      capabilities: string[];
      pricePerCall: string;
      isActive: boolean;
      endpointUrl?: string;
    },
    keypair: Keypair
  ): Promise<void> {
    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(id, { type: 'string' }),
      nativeToScVal(updates.name, { type: 'string' }),
      nativeToScVal(updates.description, { type: 'string' }),
      nativeToScVal(updates.capabilities, { type: 'vec' }),
      nativeToScVal(toStroops(updates.pricePerCall), { type: 'i128' }),
      nativeToScVal(updates.isActive, { type: 'bool' }),
      nativeToScVal(updates.endpointUrl ?? '', { type: 'bytes' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('update_agent', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);
  }

  /**
   * Submit a reputation rating for an agent after a completed interaction.
   * Rating must be 0–10000 (representing 0.00%–100.00%).
   *
   * @param id      Agent ID
   * @param rating  Rating value 0–10000
   * @param keypair Keypair of the caller (any authorized party)
   */
  async updateReputation(id: string, rating: number, keypair: Keypair): Promise<void> {
    if (rating < 0 || rating > 10000) {
      throw new ProximaError(
        'Rating must be between 0 and 10000',
        ErrorCodes.CONTRACT_ERROR
      );
    }

    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(id, { type: 'string' }),
      nativeToScVal(rating, { type: 'u32' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('update_reputation', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);
  }

  /**
   * Deactivate an agent. Must be called by the agent owner.
   */
  async deactivate(id: string, keypair: Keypair): Promise<void> {
    const account = await this.rpc.getAccount(keypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call('deactivate', nativeToScVal(id, { type: 'string' }))
      )
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const response = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(response.hash);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private _buildSimulation(method: string, args: xdr.ScVal[]) {
    // Build a minimal transaction for simulation (no real submission)
    const source = Keypair.random();
    return new TransactionBuilder(
      { accountId: () => source.publicKey(), sequenceNumber: () => '0', incrementSequenceNumber: () => {} } as any,
      { fee: BASE_FEE, networkPassphrase: this.config.networkPassphrase }
    )
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
  }

  private async _waitForConfirmation(hash: string, maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await this.rpc.getTransaction(hash);
      if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return;
      if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new ProximaError('Transaction failed', ErrorCodes.CONTRACT_ERROR, status);
      }
    }
    throw new ProximaError('Transaction confirmation timeout', ErrorCodes.NETWORK_ERROR);
  }

  private _parseAgent(raw: any): Agent {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      capabilities: raw.capabilities,
      pricePerCall: BigInt(raw.price_per_call),
      priceDisplay: `${fromStroops(BigInt(raw.price_per_call))} ${raw.payment_asset}`,
      paymentAsset: raw.payment_asset,
      paymentIssuer: raw.payment_issuer,
      owner: raw.owner,
      reputation: raw.reputation,
      reputationDisplay: formatReputation(raw.reputation),
      totalCalls: BigInt(raw.total_calls),
      isActive: raw.is_active,
      registeredAt: raw.registered_at,
      endpointUrl: raw.endpoint_url ?? '',
    };
  }
}
