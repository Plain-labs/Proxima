import { useState, useEffect, useCallback } from 'react';
import type { SpendingPolicy } from '@proxima/sdk';
import { useStellarMind } from '../lib/stellarmind.tsx';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * State returned by usePolicy hook.
 */
interface UsePolicyState {
  /** The fetched policy, or null if not found or still loading */
  policy: SpendingPolicy | null;
  /** Whether the hook is currently fetching data */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Function to manually re-fetch the policy */
  refetch: () => void;
}

/**
 * State returned by usePolicyAuthorization hook.
 */
interface UsePolicyAuthorizationState {
  /** Whether the agent is authorized under the policy, or null if not yet checked */
  authorized: boolean | null;
  /** Whether the hook is currently checking authorization */
  loading: boolean;
}

/**
 * State returned by useRemainingAllowance hook.
 */
interface UseRemainingAllowanceState {
  /** Remaining allowance in stroops (raw on-chain units), or null if not fetched */
  remaining: bigint | null;
  /** Human-readable display string (e.g. "8.5000000 USDC"), or null if not fetched */
  displayString: string | null;
  /** Whether the hook is currently fetching data */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Function to manually re-fetch the allowance */
  refetch: () => void;
}

/**
 * State returned by usePolicyCount hook.
 */
interface UsePolicyCountState {
  /** Total number of policies on-chain */
  count: bigint;
  /** Whether the hook is currently fetching data */
  loading: boolean;
}

// ─── usePolicy ───────────────────────────────────────────────────────────────

/**
 * Fetch a single spending policy by ID from the on-chain contract.
 * 
 * This hook retrieves full policy details including spending limits,
 * current spend amounts, authorized agent, and activity status.
 * 
 * @param policyId - The policy ID to fetch, or null to skip fetching
 * @returns Object containing policy data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * function PolicyDetails({ policyId }: { policyId: bigint }) {
 *   const { policy, loading, error, refetch } = usePolicy(policyId);
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!policy) return <NotFound />;
 *   
 *   return (
 *     <div>
 *       <h2>Policy #{policy.id.toString()}</h2>
 *       <p>Agent: {policy.agent}</p>
 *       <p>Daily Limit: {policy.dailyLimit.toString()} stroops</p>
 *       <p>Spent Today: {policy.spentToday.toString()} stroops</p>
 *       <p>Status: {policy.isActive ? 'Active' : 'Revoked'}</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePolicy(policyId: bigint | null): UsePolicyState {
  const proxima = useStellarMind();
  const [policy, setPolicy] = useState<SpendingPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (policyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await proxima.policy.getPolicy(policyId);
      setPolicy(result);
    } catch (err) {
      setError((err as Error).message);
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [policyId, proxima]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  return { policy, loading, error, refetch: fetchPolicy };
}

// ─── usePolicyAuthorization ──────────────────────────────────────────────────

/**
 * Check whether a given agent address is authorized under a spending policy.
 * 
 * @param policyId - The policy ID to check, or null to skip
 * @param agentAddress - The agent's Stellar address, or null to skip
 * @returns Object containing authorization status and loading flag
 * 
 * @example
 * ```tsx
 * function AuthorizationStatus({ policyId, agentAddress }: Props) {
 *   const { authorized, loading } = usePolicyAuthorization(policyId, agentAddress);
 *   
 *   if (loading) return <span>Checking...</span>;
 *   
 *   return (
 *     <span>
 *       {authorized ? '✓ Authorized' : '✗ Not Authorized'}
 *     </span>
 *   );
 * }
 * ```
 */
export function usePolicyAuthorization(
  policyId: bigint | null,
  agentAddress: string | null
): UsePolicyAuthorizationState {
  const proxima = useStellarMind();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (policyId === null || !agentAddress) {
      setAuthorized(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    proxima.policy
      .isAuthorized(policyId, agentAddress)
      .then((result: boolean) => {
        if (!cancelled) setAuthorized(result);
      })
      .catch(() => {
        if (!cancelled) setAuthorized(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId, agentAddress, proxima]);

  return { authorized, loading };
}

// ─── useRemainingAllowance ───────────────────────────────────────────────────

/**
 * Return the remaining daily spending allowance for a policy.
 * 
 * **Auto-refreshes every 30 seconds** to keep the display current,
 * which is important for policies that may be actively spending.
 * 
 * @param policyId - The policy ID to check, or null to skip
 * @returns Object containing raw allowance, display string, loading state, error, and refetch
 * 
 * @example
 * ```tsx
 * function AllowanceDisplay({ policyId }: { policyId: bigint }) {
 *   const { remaining, displayString, loading, error, refetch } = useRemainingAllowance(policyId);
 *   
 *   if (loading && remaining === null) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   
 *   return (
 *     <div>
 *       <strong>Remaining Today:</strong>
 *       <span>{displayString}</span>
 *       <small>({remaining?.toString()} stroops)</small>
 *       <button onClick={refetch}>Refresh Now</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * // Use raw bigint value for calculations
 * ```tsx
 * const { remaining } = useRemainingAllowance(policyId);
 * const canAfford = remaining !== null && remaining >= requiredAmount;
 * ```
 */
export function useRemainingAllowance(policyId: bigint | null): UseRemainingAllowanceState {
  const proxima = useStellarMind();
  const [remaining, setRemaining] = useState<bigint | null>(null);
  const [displayString, setDisplayString] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllowance = useCallback(async () => {
    if (policyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const [raw, display] = await Promise.all([
        proxima.policy.remainingAllowance(policyId),
        proxima.policy.remainingAllowanceDisplay(policyId),
      ]);
      setRemaining(raw);
      setDisplayString(display);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [policyId, proxima]);

  useEffect(() => {
    fetchAllowance();
  }, [fetchAllowance]);

  useEffect(() => {
    if (policyId === null) return;
    const interval = setInterval(fetchAllowance, 30_000);
    return () => clearInterval(interval);
  }, [policyId, fetchAllowance]);

  return { remaining, displayString, loading, error, refetch: fetchAllowance };
}

// ─── usePolicyCount ──────────────────────────────────────────────────────────

/**
 * Return the total number of spending policies ever created on-chain.
 * 
 * @returns Object containing the count as bigint and loading state
 * 
 * @example
 * ```tsx
 * function PolicyStats() {
 *   const { count, loading } = usePolicyCount();
 *   
 *   return (
 *     <div>
 *       <strong>{loading ? '–' : count.toString()}</strong> policies created
 *     </div>
 *   );
 * }
 * ```
 */
export function usePolicyCount(): UsePolicyCountState {
  const proxima = useStellarMind();
  const [count, setCount] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    proxima.policy
      .policyCount()
      .then((n: bigint) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {
        // Silently handle errors - count stays at 0
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proxima]);

  return { count, loading };
}

// ─── Mock data for the dashboard UI ──────────────────────────────────────────

/**
 * Mock policy data structure for development/demo purposes.
 */
export interface MockPolicy {
  id: string;
  agent: string;
  agentName: string;
  maxPerTx: string;
  dailyLimit: string;
  spentToday: string;
  remainingToday: string;
  totalSpent: string;
  asset: string;
  isActive: boolean;
  createdAt: string;
  txCount: number;
  /** Spend percentage 0–100 */
  spentPercent: number;
}

/**
 * Sample policy data for UI development when on-chain data is unavailable.
 */
export const MOCK_POLICIES: MockPolicy[] = [
  {
    id: 'POL-001',
    agent: 'GBKR...2XPL',
    agentName: 'Flux Image Generator',
    maxPerTx: '0.05 USDC',
    dailyLimit: '5.00 USDC',
    spentToday: '1.25 USDC',
    remainingToday: '3.75 USDC',
    totalSpent: '48.20 USDC',
    asset: 'USDC',
    isActive: true,
    createdAt: '2026-05-10',
    txCount: 964,
    spentPercent: 25,
  },
  {
    id: 'POL-002',
    agent: 'GCTP...7QMN',
    agentName: 'Web Search Agent',
    maxPerTx: '0.01 USDC',
    dailyLimit: '10.00 USDC',
    spentToday: '4.87 USDC',
    remainingToday: '5.13 USDC',
    totalSpent: '213.40 USDC',
    asset: 'USDC',
    isActive: true,
    createdAt: '2026-04-02',
    txCount: 42680,
    spentPercent: 48.7,
  },
  {
    id: 'POL-003',
    agent: 'GAMT...5PQR',
    agentName: 'Whisper Transcription',
    maxPerTx: '0.02 USDC',
    dailyLimit: '2.00 USDC',
    spentToday: '0.00 USDC',
    remainingToday: '2.00 USDC',
    totalSpent: '8.40 USDC',
    asset: 'USDC',
    isActive: false,
    createdAt: '2026-05-28',
    txCount: 420,
    spentPercent: 0,
  },
];
