import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  Keypair,
} from '@stellar/stellar-sdk';
import { rpc as SorobanRpc } from '@stellar/stellar-sdk';

import { ProximaError, ErrorCodes } from './types';
import type {
  SpendingPolicy,
  CreatePolicyParams,
  ExecutePaymentParams,
  PaymentRecord,
} from './types';
import {
  ResolvedConfig,
  createRpcServer,
  toStroops,
  fromStroops,
} from './stellar';

/**
 * PolicyClient — interact with the Proxima Spending Policy contract.
 *
 * This is the core of Proxima's autonomous payment capability.
 * It allows AI agents to make payments without per-transaction human approval,
 * within the boundaries defined by the policy owner.
 *
 * @example
 * ```ts
 * const policy = new PolicyClient(config)
 *
 * // Create a policy: authorize an agent to spend up to 10 USDC/day
 * const policyId = await policy.create({
 *   agent: 'GDATAAGENT...',
 *   maxPerTx: '0.50',
 *   dailyLimit: '10.00',
 *   asset: 'USDC',
 *   issuer: USDC_ISSUER.mainnet,
 * }, ownerKeypair)
 *
 * // Agent executes a payment autonomously (no owner signature needed)
 * await policy.executePayment({
 *   policyId,
 *   recipient: 'GRECIPIENT...',
 *   amount: '0.01',
 *   memo: 'API call #4821',
 * }, agentKeypair)
 * ```
 */
export class PolicyClient {
  private rpc: SorobanRpc.Server;
  private contract: Contract;

  constructor(private config: ResolvedConfig) {
    this.rpc = createRpcServer(config);
    this.contract = new Contract(config.policyContractId);
  }

  /**
   * Return total number of policies ever created on-chain.
   */
  async policyCount(): Promise<bigint> {
    const result = await this.rpc.simulateTransaction(
      this._buildSimulation('policy_count', [])
    );
    if (SorobanRpc.Api.isSimulationError(result)) return 0n;
    const raw = scValToNative(
      (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
    return BigInt(raw as number);
  }

  // ─── Read Methods ───────────────────────────────────────────────────────────

  /**
   * Retrieve a spending policy by ID.
   */
  async getPolicy(policyId: bigint): Promise<SpendingPolicy> {
    const result = await this.rpc.simulateTransaction(
      this._buildSimulation('get_policy', [nativeToScVal(policyId, { type: 'u64' })])
    );

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new ProximaError(
        `Policy ${policyId} not found`,
        ErrorCodes.POLICY_NOT_FOUND,
        result.error
      );
    }

    const raw = scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval);
    return this._parsePolicy(raw);
  }

  /**
   * Check if an agent is authorized under a given policy.
   */
  async isAuthorized(policyId: bigint, agentAddress: string): Promise<boolean> {
    const result = await this.rpc.simulateTransaction(
      this._buildSimulation('is_authorized', [
        nativeToScVal(policyId, { type: 'u64' }),
        nativeToScVal(agentAddress, { type: 'address' }),
      ])
    );
    if (SorobanRpc.Api.isSimulationError(result)) return false;
    return scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval) as boolean;
  }

  /**
   * Return remaining daily allowance for a policy (in stroops).
   */
  async remainingAllowance(policyId: bigint): Promise<bigint> {
    const result = await this.rpc.simulateTransaction(
      this._buildSimulation('remaining_allowance', [
        nativeToScVal(policyId, { type: 'u64' }),
      ])
    );
    if (SorobanRpc.Api.isSimulationError(result)) return 0n;
    const raw = scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval);
    return BigInt(raw as number);
  }

  /**
   * Return remaining allowance as a display string (e.g. "8.5000000 USDC").
   */
  async remainingAllowanceDisplay(policyId: bigint): Promise<string> {
    const policy = await this.getPolicy(policyId);
    const remaining = await this.remainingAllowance(policyId);
    return `${fromStroops(remaining)} ${policy.asset}`;
  }

  // ─── Write Methods ──────────────────────────────────────────────────────────

  /**
   * Create a new spending policy.
   *
   * @param params  Policy creation parameters
   * @param keypair Keypair of the policy owner
   * @returns       The new policy ID
   */
  async create(params: CreatePolicyParams, keypair: Keypair): Promise<bigint> {
    const account = await this.rpc.getAccount(keypair.publicKey());

    const args = [
      nativeToScVal(params.agent, { type: 'address' }),
      nativeToScVal(toStroops(params.maxPerTx), { type: 'i128' }),
      nativeToScVal(toStroops(params.dailyLimit), { type: 'i128' }),
      nativeToScVal(params.asset, { type: 'string' }),
      nativeToScVal(params.issuer, { type: 'address' }),
      params.allowedRecipient
        ? xdr.ScVal.scvVec([nativeToScVal(params.allowedRecipient, { type: 'address' })])
        : xdr.ScVal.scvVoid(),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('create_policy', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(keypair);

    const sendResult = await this.rpc.sendTransaction(prepared);
    const txResult = await this._waitForConfirmation(sendResult.hash);

    // Extract policy ID from return value
    const returnVal = scValToNative(txResult);
    return BigInt(returnVal as number);
  }

  /**
   * Execute an autonomous payment under a spending policy.
   *
   * This is the heart of Proxima. The agent signs this transaction —
   * the owner does NOT need to be present. The Soroban contract enforces
   * all spending limits on-chain.
   *
   * @param params  Payment parameters
   * @param agentKeypair  Keypair of the authorized agent
   * @returns       The payment record
   */
  async executePayment(
    params: ExecutePaymentParams,
    agentKeypair: Keypair
  ): Promise<PaymentRecord> {
    const account = await this.rpc.getAccount(agentKeypair.publicKey());

    const args = [
      nativeToScVal(params.policyId, { type: 'u64' }),
      nativeToScVal(params.recipient, { type: 'address' }),
      nativeToScVal(toStroops(params.amount), { type: 'i128' }),
      nativeToScVal(params.memo, { type: 'string' }),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(this.contract.call('execute_payment', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(agentKeypair); // ← agent signs, NOT the owner

    const sendResult = await this.rpc.sendTransaction(prepared);
    const retval = await this._waitForConfirmation(sendResult.hash);

    return this._parsePaymentRecord(scValToNative(retval));
  }

  /**
   * Revoke a spending policy. Only the owner can revoke.
   */
  async revoke(policyId: bigint, ownerKeypair: Keypair): Promise<void> {
    const account = await this.rpc.getAccount(ownerKeypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call('revoke_policy', nativeToScVal(policyId, { type: 'u64' }))
      )
      .setTimeout(30)
      .build();

    const prepared = await this.rpc.prepareTransaction(tx);
    prepared.sign(ownerKeypair);

    const sendResult = await this.rpc.sendTransaction(prepared);
    await this._waitForConfirmation(sendResult.hash);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private _buildSimulation(method: string, args: xdr.ScVal[]) {
    const source = Keypair.random();
    return new TransactionBuilder(
      { accountId: () => source.publicKey(), sequenceNumber: () => '0', incrementSequenceNumber: () => {} } as any,
      { fee: BASE_FEE, networkPassphrase: this.config.networkPassphrase }
    )
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();
  }

  private async _waitForConfirmation(hash: string, maxAttempts = 10): Promise<xdr.ScVal> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await this.rpc.getTransaction(hash);
      if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return (status as SorobanRpc.Api.GetSuccessfulTransactionResponse).returnValue!;
      }
      if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new ProximaError('Transaction failed', ErrorCodes.CONTRACT_ERROR, status);
      }
    }
    throw new ProximaError('Confirmation timeout', ErrorCodes.NETWORK_ERROR);
  }

  private _parsePolicy(raw: any): SpendingPolicy {
    return {
      id: BigInt(raw.id),
      owner: raw.owner,
      agent: raw.agent,
      maxPerTx: BigInt(raw.max_per_tx),
      dailyLimit: BigInt(raw.daily_limit),
      asset: raw.asset,
      issuer: raw.issuer,
      spentToday: BigInt(raw.spent_today),
      totalSpent: BigInt(raw.total_spent),
      isActive: raw.is_active,
      createdAt: raw.created_at,
      allowedRecipient: raw.allowed_recipient ?? undefined,
      remainingAllowance: BigInt(raw.daily_limit) - BigInt(raw.spent_today),
    };
  }

  private _parsePaymentRecord(raw: any): PaymentRecord {
    return {
      policyId: BigInt(raw.policy_id),
      agent: raw.agent,
      recipient: raw.recipient,
      amount: BigInt(raw.amount),
      asset: raw.asset,
      memo: raw.memo,
      ledger: raw.ledger,
    };
  }
}
