import { useState, useEffect, useCallback } from 'react';
import type { Agent, FindAgentsParams } from '../lib/proxima';
import { getProxima } from '../lib/proxima';

// ─── useAgent ────────────────────────────────────────────────────────────────

interface UseAgentState {
  agent: Agent | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch a single agent by ID from the on-chain registry.
 *
 * @example
 * const { agent, loading, error } = useAgent('gpt-inference-v2')
 */
export function useAgent(id: string | null): UseAgentState {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const proxima = getProxima();
      const result = await proxima.registry.getAgent(id);
      setAgent(result);
    } catch (err) {
      setError((err as Error).message);
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { agent, loading, error, refetch: fetch };
}

// ─── useAgentCount ───────────────────────────────────────────────────────────

interface UseAgentCountState {
  count: bigint;
  loading: boolean;
  error: string | null;
}

/**
 * Return the total number of agents registered on-chain.
 */
export function useAgentCount(): UseAgentCountState {
  const [count, setCount] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProxima()
      .registry.agentCount()
      .then((n) => { if (!cancelled) setCount(n); })
      .catch((err) => { if (!cancelled) setError((err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { count, loading, error };
}

// ─── useAgentExists ──────────────────────────────────────────────────────────

/**
 * Check whether an agent ID is already registered.
 * Useful for the registration form to show an availability badge.
 */
export function useAgentExists(id: string): {
  exists: boolean | null;
  checking: boolean;
} {
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!id || id.length < 2) {
      setExists(null);
      return;
    }
    let cancelled = false;
    // Debounce by 400ms so we don't hammer the RPC on every keystroke
    const timer = setTimeout(() => {
      setChecking(true);
      getProxima()
        .registry.agentExists(id)
        .then((result) => { if (!cancelled) setExists(result); })
        .catch(() => { if (!cancelled) setExists(null); })
        .finally(() => { if (!cancelled) setChecking(false); });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return { exists, checking };
}

// ─── useMockAgents ───────────────────────────────────────────────────────────
// Temporary stand-in for useAgents() until the indexer integration is complete.
// The dashboard uses this so the UI works without a live RPC connection.

export interface MockAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  priceDisplay: string;
  reputationDisplay: string;
  reputation: number;
  totalCalls: number;
  isActive: boolean;
  owner: string;
  registeredAt: string;
}

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: 'gpt-inference-v2',
    name: 'GPT Inference Relay',
    description: 'High-throughput text generation and completion via OpenAI-compatible API.',
    capabilities: ['text-generation', 'completion', 'summarization'],
    priceDisplay: '0.0100000 USDC',
    reputationDisplay: '94.20%',
    reputation: 9420,
    totalCalls: 48291,
    isActive: true,
    owner: 'GDXK...A3MN',
    registeredAt: '2026-04-12',
  },
  {
    id: 'flux-image-gen-v1',
    name: 'Flux Image Generator',
    description: 'State-of-the-art image generation. Supports 1:1, 16:9, and portrait formats.',
    capabilities: ['image-generation', 'text-to-image'],
    priceDisplay: '0.0500000 USDC',
    reputationDisplay: '91.75%',
    reputation: 9175,
    totalCalls: 12840,
    isActive: true,
    owner: 'GBKR...2XPL',
    registeredAt: '2026-03-28',
  },
  {
    id: 'web-search-agent-v3',
    name: 'Web Search Agent',
    description: 'Real-time web search with structured JSON output.',
    capabilities: ['web-search', 'data-retrieval'],
    priceDisplay: '0.0050000 USDC',
    reputationDisplay: '88.40%',
    reputation: 8840,
    totalCalls: 93102,
    isActive: true,
    owner: 'GCTP...7QMN',
    registeredAt: '2026-02-15',
  },
  {
    id: 'whisper-transcription-v1',
    name: 'Whisper Transcription',
    description: 'Audio-to-text transcription using Whisper Large v3. 50+ languages supported.',
    capabilities: ['speech-to-text', 'transcription', 'translation'],
    priceDisplay: '0.0200000 USDC',
    reputationDisplay: '96.10%',
    reputation: 9610,
    totalCalls: 7421,
    isActive: true,
    owner: 'GAMT...5PQR',
    registeredAt: '2026-05-01',
  },
  {
    id: 'code-executor-sandbox-v2',
    name: 'Code Executor Sandbox',
    description: 'Secure sandboxed Python/JS code execution with stdout, stderr output.',
    capabilities: ['code-execution', 'python', 'javascript'],
    priceDisplay: '0.0150000 USDC',
    reputationDisplay: '79.30%',
    reputation: 7930,
    totalCalls: 5209,
    isActive: true,
    owner: 'GBMC...1ZXA',
    registeredAt: '2026-04-20',
  },
];

/**
 * Filter and sort the mock agent list.
 * Once the indexer integration lands, this hook will query the chain instead.
 */
export function useMockAgents(params: FindAgentsParams & { sortBy?: 'reputation' | 'calls' | 'price' } = {}) {
  const { capability, maxPrice, minReputation, activeOnly, sortBy = 'reputation' } = params;

  const filtered = MOCK_AGENTS.filter((a) => {
    if (activeOnly && !a.isActive) return false;
    if (capability && !a.capabilities.includes(capability)) return false;
    if (minReputation !== undefined && a.reputation / 100 < minReputation) return false;
    if (maxPrice) {
      const price = parseFloat(a.priceDisplay);
      if (price > parseFloat(maxPrice)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'reputation') return b.reputation - a.reputation;
    if (sortBy === 'calls') return b.totalCalls - a.totalCalls;
    if (sortBy === 'price') return parseFloat(a.priceDisplay) - parseFloat(b.priceDisplay);
    return 0;
  });

  return filtered;
}
