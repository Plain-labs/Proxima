// ─── Proxima SDK Types ───────────────────────────────────────────────────────

export type Network = 'mainnet' | 'testnet' | 'futurenet';

export interface ProximaConfig {
  network: Network;
  /** Custom RPC URL (optional — defaults to SDF public RPC) */
  rpcUrl?: string;
  /** Custom Horizon URL (optional) */
  horizonUrl?: string;
  /** Deployed Registry contract ID */
  registryContractId?: string;
  /** Deployed Policy contract ID */
  policyContractId?: string;
}

// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  /** Price per call in stroops (divide by 10_000_000 for XLM) */
  pricePerCall: bigint;
  /** Display price in asset units (e.g. "0.01 USDC") */
  priceDisplay: string;
  paymentAsset: string;
  paymentIssuer: string;
  owner: string;
  /** Reputation score 0–10000 (divide by 100 for percentage) */
  reputation: number;
  /** Reputation as percentage string e.g. "87.50%" */
  reputationDisplay: string;
  totalCalls: bigint;
  isActive: boolean;
  registeredAt: number;
  endpointUrl: string;
}

export interface RegisterAgentParams {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  /** Price per call in asset units (e.g. "0.01" for 0.01 USDC) */
  pricePerCall: string;
  paymentAsset: 'USDC' | 'XLM' | string;
  paymentIssuer: string;
  endpointUrl?: string;
}

export interface FindAgentsParams {
  capability?: string;
  /** Maximum price in asset units */
  maxPrice?: string;
  /** Minimum reputation percentage (0–100) */
  minReputation?: number;
  activeOnly?: boolean;
}

// ─── Spending Policy Types ────────────────────────────────────────────────────

export interface SpendingPolicy {
  id: bigint;
  owner: string;
  agent: string;
  /** Max per single tx in stroops */
  maxPerTx: bigint;
  /** Max per day in stroops */
  dailyLimit: bigint;
  asset: string;
  issuer: string;
  spentToday: bigint;
  totalSpent: bigint;
  isActive: boolean;
  createdAt: number;
  allowedRecipient?: string;
  /** Remaining allowance today in stroops */
  remainingAllowance: bigint;
}

export interface CreatePolicyParams {
  /** Address of the agent being authorized */
  agent: string;
  /** Max amount per single transaction (in asset units, e.g. "0.50") */
  maxPerTx: string;
  /** Max total per day (in asset units, e.g. "10.00") */
  dailyLimit: string;
  asset: 'USDC' | 'XLM' | string;
  issuer: string;
  /** Optional: restrict to a single recipient */
  allowedRecipient?: string;
}

export interface ExecutePaymentParams {
  policyId: bigint;
  recipient: string;
  /** Amount in asset units (e.g. "0.01") */
  amount: string;
  memo: string;
}

export interface PaymentRecord {
  policyId: bigint;
  agent: string;
  recipient: string;
  amount: bigint;
  asset: string;
  memo: string;
  ledger: number;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export interface ProximaEvent {
  type:
    | 'AgentRegistered'
    | 'AgentUpdated'
    | 'AgentDeactivated'
    | 'ReputationUpdated'
    | 'PolicyCreated'
    | 'PolicyRevoked'
    | 'PaymentExecuted';
  data: unknown;
  ledger: number;
  txHash: string;
  timestamp: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ProximaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ProximaError';
  }
}

export const ErrorCodes = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  POLICY_INACTIVE: 'POLICY_INACTIVE',
  EXCEEDS_PER_TX_LIMIT: 'EXCEEDS_PER_TX_LIMIT',
  EXCEEDS_DAILY_LIMIT: 'EXCEEDS_DAILY_LIMIT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
} as const;
