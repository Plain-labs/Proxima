/**
 * useEventFeed.ts
 *
 * Streams on-chain contract events from the Proxima Registry and Policy
 * contracts via Stellar Horizon's Server-Sent Events (SSE) endpoint.
 *
 * Falls back to a simulated feed when Horizon is unreachable (e.g. local dev).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentNetworkInfo } from '../lib/proxima';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'payment'
  | 'register'
  | 'policy_create'
  | 'policy_revoke'
  | 'reputation'
  | 'deactivate';

export interface FeedEvent {
  id: string;
  type: EventType;
  title: string;
  detail: string;
  amount?: string;
  txHash: string;
  ledger: number;
  timestamp: string;
}

// ─── Horizon event record shape (minimal) ────────────────────────────────────

interface HorizonContractEvent {
  id: string;
  type: string;
  ledger: number;
  ledger_closed_at: string;
  contract_id: string;
  tx_hash: string;
  topic: string[];   // base64-encoded ScVal topics
  value: string;     // base64-encoded ScVal payload
}

// ─── Topic → event type map ───────────────────────────────────────────────────
// Soroban event topics are base64-encoded XDR ScVal symbols.
// The XDR encoding for a ScSymbol wraps the string with a 4-byte type prefix
// (0x00000006) + 4-byte length + the UTF-8 bytes.
// We extract the symbol string by decoding and slicing past the prefix.

function decodeScSymbol(b64: string): string {
  try {
    const binary = atob(b64);
    // ScSymbol XDR: 4 bytes type (0x00000006) + 4 bytes length + N bytes string
    if (binary.length < 8) return '';
    const len = binary.charCodeAt(7); // last byte of the 4-byte length field
    return binary.slice(8, 8 + len);
  } catch {
    return '';
  }
}

function classifyTopics(topics: string[]): EventType | null {
  if (topics.length < 2) return null;
  const t1 = decodeScSymbol(topics[0]);
  const t2 = decodeScSymbol(topics[1]);

  if (t1.includes('regist')) return 'register';
  if (t1.includes('repupd')) return 'reputation';
  if (t1.includes('deact')) return 'deactivate';
  if (t1.includes('policy') && t2.includes('create')) return 'policy_create';
  if (t1.includes('policy') && t2.includes('revoke')) return 'policy_revoke';
  if (t1.includes('pay')) return 'payment';
  return null;
}

function formatEvent(raw: HorizonContractEvent): FeedEvent | null {
  const type = classifyTopics(raw.topic);
  if (!type) return null;

  const short = raw.tx_hash.slice(0, 8) + '...' + raw.tx_hash.slice(-4);
  const time = new Date(raw.ledger_closed_at).toLocaleTimeString();

  const titles: Record<EventType, string> = {
    payment: 'Payment Executed',
    register: 'Agent Registered',
    policy_create: 'Policy Created',
    policy_revoke: 'Policy Revoked',
    reputation: 'Reputation Updated',
    deactivate: 'Agent Deactivated',
  };

  return {
    id: raw.id,
    type,
    title: titles[type],
    detail: `Contract ${raw.contract_id.slice(0, 6)}...${raw.contract_id.slice(-4)}`,
    txHash: short,
    ledger: raw.ledger,
    timestamp: time,
  };
}

// ─── Simulated events for local dev ──────────────────────────────────────────

const AGENTS = ['gpt-inference-v2', 'flux-image-gen-v1', 'web-search-agent-v3'];
const POLICIES = ['POL-001', 'POL-002', 'POL-003'];

function randomSimulatedEvent(): FeedEvent {
  const types: EventType[] = ['payment', 'payment', 'payment', 'register', 'reputation', 'policy_create'];
  const type = types[Math.floor(Math.random() * types.length)];
  const hash = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const details: Record<EventType, string> = {
    payment: `${POLICIES[Math.floor(Math.random() * POLICIES.length)]} → G${hash.toUpperCase().slice(0, 4)}...`,
    register: `${AGENTS[Math.floor(Math.random() * AGENTS.length)]} registered`,
    policy_create: `New policy · ${(Math.random() * 20 + 1).toFixed(0)} USDC/day`,
    policy_revoke: `${POLICIES[Math.floor(Math.random() * POLICIES.length)]} revoked`,
    reputation: `${AGENTS[Math.floor(Math.random() * AGENTS.length)]} → ${(Math.random() * 30 + 70).toFixed(2)}%`,
    deactivate: `${AGENTS[Math.floor(Math.random() * AGENTS.length)]} deactivated`,
  };

  return {
    id: Date.now().toString() + Math.random(),
    type,
    title: {
      payment: 'Payment Executed',
      register: 'Agent Registered',
      policy_create: 'Policy Created',
      policy_revoke: 'Policy Revoked',
      reputation: 'Reputation Updated',
      deactivate: 'Agent Deactivated',
    }[type],
    detail: details[type],
    amount: type === 'payment' ? `${(Math.random() * 0.05 + 0.005).toFixed(4)} USDC` : undefined,
    txHash: `${hash}...${hash.slice(-4)}`,
    ledger: Math.floor(Math.random() * 1000) + 54_000_000,
    timestamp: new Date().toLocaleTimeString(),
  };
}

// ─── useEventFeed ─────────────────────────────────────────────────────────────

interface UseEventFeedOptions {
  /** Max events to keep in state (default: 20) */
  maxEvents?: number;
  /** Whether streaming is paused */
  paused?: boolean;
  /** Simulate events when Horizon is unreachable (default: true) */
  simulateOnFailure?: boolean;
}

export function useEventFeed(options: UseEventFeedOptions = {}) {
  const { maxEvents = 20, paused = false, simulateOnFailure = true } = options;

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [live, setLive] = useState(false);
  const [usingSimulation, setUsingSimulation] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushEvent = useCallback(
    (event: FeedEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, maxEvents));
    },
    [maxEvents]
  );

  // ── Start Horizon SSE stream ───────────────────────────────────────────────

  const startHorizonStream = useCallback(() => {
    const { horizonUrl, registryContractId, policyContractId } = getCurrentNetworkInfo();

    // Horizon SSE endpoint for contract events — one stream per contract,
    // merged into a single feed. The correct path is /contract_events with
    // ?contract_id= (singular) and cursor=now to get only new events.
    const contracts = [registryContractId, policyContractId].filter(Boolean);
    if (contracts.length === 0) {
      if (simulateOnFailure) startSimulation();
      return;
    }

    // Open one EventSource per contract and merge into shared state
    let connectedCount = 0;
    const sources: EventSource[] = [];

    const onError = () => {
      sources.forEach((s) => s.close());
      sources.length = 0;
      setLive(false);
      if (simulateOnFailure) startSimulation();
    };

    contracts.forEach((contractId) => {
      const url =
        `${horizonUrl}/contract_events` +
        `?contract_id=${contractId}` +
        `&cursor=now` +
        `&order=asc` +
        `&limit=100`;

      try {
        const es = new EventSource(url);
        sources.push(es);
        esRef.current = es; // keep last ref for cleanup

        es.addEventListener('message', (e) => {
          try {
            const raw: HorizonContractEvent = JSON.parse(e.data);
            const event = formatEvent(raw);
            if (event) pushEvent(event);
          } catch {
            // malformed event — skip
          }
        });

        es.addEventListener('open', () => {
          connectedCount++;
          if (connectedCount === contracts.length) {
            setLive(true);
            setUsingSimulation(false);
          }
        });

        es.addEventListener('error', onError);
      } catch {
        onError();
      }
    });

    // Store cleanup function
    esRef.current = { close: () => sources.forEach((s) => s.close()) } as EventSource;
  }, [pushEvent, simulateOnFailure]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Simulated feed fallback ───────────────────────────────────────────────

  const startSimulation = useCallback(() => {
    setUsingSimulation(true);
    setLive(true);
    simRef.current = setInterval(() => {
      pushEvent(randomSimulatedEvent());
    }, 3500);
  }, [pushEvent]);

  const stopSimulation = useCallback(() => {
    if (simRef.current) {
      clearInterval(simRef.current);
      simRef.current = null;
    }
    setLive(false);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (paused) {
      esRef.current?.close();
      stopSimulation();
      return;
    }

    startHorizonStream();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      stopSimulation();
    };
  }, [paused, startHorizonStream, stopSimulation]);

  return { events, live, usingSimulation };
}
