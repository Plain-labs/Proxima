/**
 * @proxima/sdk
 *
 * The official TypeScript SDK for Proxima — AI Agent Registry &
 * Autonomous Payment Gateway on Stellar.
 *
 * @example
 * ```ts
 * import { Proxima, USDC_ISSUER } from '@proxima/sdk'
 *
 * const proxima = new Proxima({ network: 'testnet' })
 *
 * // Register an agent
 * await proxima.registry.register({ ... }, keypair)
 *
 * // Create a spending policy
 * const policyId = await proxima.policy.create({
 *   agent: agentAddress,
 *   dailyLimit: '10.00',
 *   maxPerTx: '0.50',
 *   asset: 'USDC',
 *   issuer: USDC_ISSUER.testnet,
 * }, ownerKeypair)
 *
 * // Agent pays autonomously
 * await proxima.policy.executePayment({ policyId, recipient, amount: '0.01', memo: '...' }, agentKeypair)
 * ```
 */

import { resolveConfig } from './stellar';
import { RegistryClient } from './registry';
import { PolicyClient } from './policy';
import type { ProximaConfig } from './types';

export class Proxima {
  public readonly registry: RegistryClient;
  public readonly policy: PolicyClient;

  constructor(config: ProximaConfig) {
    const resolved = resolveConfig(config);
    this.registry = new RegistryClient(resolved);
    this.policy = new PolicyClient(resolved);
  }
}

// Named exports for convenience
export { RegistryClient } from './registry';
export { PolicyClient } from './policy';
export { USDC_ISSUER, toStroops, fromStroops, formatReputation, resolveConfig } from './stellar';
export type {
  Agent,
  RegisterAgentParams,
  UpdateAgentParams,
  FindAgentsParams,
  SpendingPolicy,
  CreatePolicyParams,
  ExecutePaymentParams,
  PaymentRecord,
  ProximaConfig,
  Network,
  ProximaEvent,
} from './types';
export { ProximaError, ErrorCodes } from './types';
