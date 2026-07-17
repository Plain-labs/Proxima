import { useState, useEffect, useCallback } from 'react';
import type { SpendingPolicy } from '../lib/proxima';
import { getProxima } from '../lib/proxima';

// ─── usePolicy ───────────────────────────────────────────────────────────────

interface UsePolicyState {
  policy: SpendingPolicy | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch a single spending policy by ID from the on-chain contract.
 *
 * @example
 * const { policy, loading } = usePolicy(1n)
 */
export function usePolicy(policyId: bigint | null): UsePolicyState {
  const [policy, setPolicy] = useState<SpendingPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (policyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const proxima = getProxima();
      const result = await proxima.policy.getPolicy(policyId);
      setPolicy(result);
    } catch (err) {
      setError((err as Error).message);
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { policy, loading, error, refetch: fetch };
}

// ─── usePolicyAuthorization ──────────────────────────────────────────────────

/**
 * Check whether a given agent address is authorized under a policy.
 */
export function usePolicyAuthorization(
  policyId: bigint | null,
  agentAddress: string | null
): { authorized: boolean | null; loading: boolean } {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (policyId === null || !agentAddress) {
      setAuthorized(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProxima()
      .policy.isAuthorized(policyId, agentAddress)
      .then((result: boolean) => { if (!cancelled) setAuthorized(result); })
      .catch(() => { if (!cancelled) setAuthorized(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [policyId, agentAddress]);

  return { authorized, loading };
}

// ─── useRemainingAllowance ───────────────────────────────────────────────────

interface UseAllowanceState {
  remaining: bigint | null;
  displayString: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Return the remaining daily spending allowance for a policy.
 * Automatically re-fetches every 30 seconds to stay current.
 */
export function useRemainingAllowance(policyId: bigint | null): UseAllowanceState {
  const [remaining, setRemaining] = useState<bigint | null>(null);
  const [displayString, setDisplayString] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (policyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const proxima = getProxima();
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
  }, [policyId]);

  // Initial fetch
  useEffect(() => { fetch(); }, [fetch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (policyId === null) return;
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [policyId, fetch]);

  return { remaining, displayString, loading, error, refetch: fetch };
}

// ─── usePolicyCount ──────────────────────────────────────────────────────────

/**
 * Return total number of policies ever created on-chain.
 */
export function usePolicyCount(): { count: bigint; loading: boolean } {
  const [count, setCount] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProxima()
      .policy.policyCount()
      .then((n: bigint) => { if (!cancelled) setCount(n); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { count, loading };
}

// ─── Mock data for the dashboard UI ──────────────────────────────────────────
// Used while the live contract integration is wired up.

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
