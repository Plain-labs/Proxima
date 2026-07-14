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
   * Note: This queries the chain for known agents — in production this would
   * be backed by an indexer for efficient filtering.
   */
  async find(params: FindAgentsParams = {}): Promise<Agent[]> {
    // In production, this would query an indexer (e.g. Stellar Turrets or a
    // custom indexer that indexes AgentRegistered events).
    // For now, this demonstrates the pattern.

    // TODO: integrate with event indexer for efficient search
    // For initial release: pull from a known list maintained off-chain
    throw new ProximaError(
      'find() requires an indexer integration — see docs/SDK_GUIDE.md for setup',
      'NOT_IMPLEMENTED'
    );
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
