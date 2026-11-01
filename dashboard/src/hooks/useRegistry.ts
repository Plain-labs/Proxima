import { useState, useEffect, useCallback } from 'react';
import type { Agent, FindAgentsParams } from '@proxima/sdk';
import { useStellarMind } from '../lib/stellarmind.tsx';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * State returned by useAgent hook.
 */
interface UseAgentState {
  /** The fetched agent, or null if not found or still loading */
  agent: Agent | null;
  /** Whether the hook is currently fetching data */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Function to manually re-fetch the agent */
  refetch: () => void;
}

/**
 * State returned by useAgentCount hook.
 */
interface UseAgentCountState {
  /** Total number of registered agents on-chain */
  count: bigint;
  /** Whether the hook is currently fetching data */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
}

/**
 * State returned by useAgentExists hook.
 */
interface UseAgentExistsState {
  /** Whether the agent ID exists, or null if not yet checked */
  exists: boolean | null;
  /** Whether the hook is currently checking */
  checking: boolean;
}

/**
 * State returned by useAgentSearch hook.
 */
interface UseAgentSearchState {
  /** Array of agents matching the search criteria */
  agents: Agent[];
  /** Whether the hook is currently fetching data */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Function to manually re-fetch agents */
  refetch: () => void;
}

// ─── useAgent ────────────────────────────────────────────────────────────────

/**
 * Fetch a single agent by ID from the on-chain registry.
 * 
 * This hook fetches an agent's full metadata including name, description,
 * capabilities, pricing, reputation score, and activity status.
 * 
 * @param id - The unique agent identifier to fetch, or null to skip fetching
 * @returns Object containing agent data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * function AgentDetails({ agentId }: { agentId: string }) {
 *   const { agent, loading, error, refetch } = useAgent(agentId);
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!agent) return <NotFound />;
 *   
 *   return (
 *     <div>
 *       <h1>{agent.name}</h1>
 *       <p>{agent.description}</p>
 *       <span>Price: {agent.priceDisplay}</span>
 *       <span>Reputation: {agent.reputationDisplay}</span>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(id: string | null): UseAgentState {
  const proxima = useStellarMind();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await proxima.registry.getAgent(id);
      setAgent(result);
    } catch (err) {
      setError((err as Error).message);
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [id, proxima]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}

// ─── useAgentCount ───────────────────────────────────────────────────────────

/**
 * Return the total number of agents registered on-chain.
 * 
 * This hook fetches the agent count once on mount. The count represents
 * all agents ever registered, including inactive ones.
 * 
 * @returns Object containing the count as bigint, loading state, and error
 * 
 * @example
 * ```tsx
 * function RegistryStats() {
 *   const { count, loading, error } = useAgentCount();
 *   
 *   if (loading) return <span>Loading...</span>;
 *   if (error) return <span>Error: {error}</span>;
 *   
 *   return (
 *     <div>
 *       <strong>{count.toString()}</strong> agents registered
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentCount(): UseAgentCountState {
  const proxima = useStellarMind();
  const [count, setCount] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    proxima.registry
      .agentCount()
      .then((n: bigint) => {
        if (!cancelled) setCount(n);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proxima]);

  return { count, loading, error };
}

// ─── useAgentExists ──────────────────────────────────────────────────────────

/**
 * Check whether an agent ID is already registered on-chain.
 * 
 * Useful for the registration form to show an availability badge.
 * Includes a 400ms debounce to avoid excessive RPC calls on rapid input changes.
 * 
 * @param id - The agent ID to check (must be at least 2 characters)
 * @returns Object containing exists status and checking flag
 * 
 * @example
 * ```tsx
 * function AgentIdInput() {
 *   const [id, setId] = useState('');
 *   const { exists, checking } = useAgentExists(id);
 *   
 *   return (
 *     <div>
 *       <input
 *         value={id}
 *         onChange={(e) => setId(e.target.value)}
 *         placeholder="Enter agent ID"
 *       />
 *       {checking && <span>Checking...</span>}
 *       {exists === true && <span style={{ color: 'red' }}>ID taken</span>}
 *       {exists === false && <span style={{ color: 'green' }}>Available</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentExists(id: string): UseAgentExistsState {
  const proxima = useStellarMind();
  const [exists, setExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!id || id.length < 2) {
      setExists(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setChecking(true);
      proxima.registry
        .agentExists(id)
        .then((result: boolean) => {
          if (!cancelled) setExists(result);
        })
        .catch(() => {
          if (!cancelled) setExists(null);
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, proxima]);

  return { exists, checking };
}

// ─── useAgentSearch ──────────────────────────────────────────────────────────

/**
 * Search for agents matching filter criteria from the on-chain registry.
 * 
 * This hook fetches agents using the Proxima SDK's find() method and
 * automatically re-fetches when search parameters change. Results are
 * sorted by reputation descending by default.
 * 
 * @param params - Filter and sort criteria for the agent search
 * @returns Object containing agents array, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * function ImageAgents() {
 *   const { agents, loading, error, refetch } = useAgentSearch({
 *     capability: 'image-generation',
 *     maxPrice: '0.05',
 *     activeOnly: true,
 *   });
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} onRetry={refetch} />;
 *   
 *   return (
 *     <ul>
 *       {agents.map((agent) => (
 *         <li key={agent.id}>
 *           {agent.name} - {agent.priceDisplay}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * 
 * @example
 * // Search with multiple filters
 * ```tsx
 * const { agents } = useAgentSearch({
 *   capability: 'text-generation',
 *   minReputation: 80,
 *   maxPrice: '0.02',
 *   activeOnly: true,
 * });
 * ```
 */
export function useAgentSearch(params: FindAgentsParams = {}): UseAgentSearchState {
  const proxima = useStellarMind();
  const { capability, maxPrice, minReputation, activeOnly } = params;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await proxima.registry.find({
        capability,
        maxPrice,
        minReputation,
        activeOnly,
      });
      setAgents(results);
    } catch (err) {
      setError((err as Error).message);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [proxima, capability, maxPrice, minReputation, activeOnly]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

// ─── Mock Data (for development/demo purposes) ───────────────────────────────

/**
 * Mock agent data structure used when the RPC is unavailable.
 * Matches the Agent type with display-friendly fields.
 */
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

/**
 * Sample agent data for UI development when on-chain data is unavailable.
 */
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
 * Filter and sort mock agent data for development/demo purposes.
 * 
 * @param params - Filter and sort criteria
 * @returns Filtered and sorted mock agents
 * 
 * @internal
 */
export function filterMockAgents(
  params: FindAgentsParams & { sortBy?: 'reputation' | 'calls' | 'price' } = {}
): MockAgent[] {
  const { capability, maxPrice, minReputation, activeOnly, sortBy = 'reputation' } = params;

  return MOCK_AGENTS.filter((a) => {
    if (activeOnly && !a.isActive) return false;
    if (capability && !a.capabilities.includes(capability)) return false;
    if (minReputation !== undefined && a.reputation / 100 < minReputation) return false;
    if (maxPrice) {
      const price = parseFloat(a.priceDisplay);
      if (price > parseFloat(maxPrice)) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'reputation':
        return b.reputation - a.reputation;
      case 'calls':
        return b.totalCalls - a.totalCalls;
      case 'price':
        return parseFloat(a.priceDisplay) - parseFloat(b.priceDisplay);
      default: {
        const _exhaustiveCheck: never = sortBy;
        return _exhaustiveCheck;
      }
    }
  });
}
