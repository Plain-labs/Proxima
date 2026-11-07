import { useState, useMemo } from "react";
import type { Agent } from "@proxima/sdk";
import { useAgentSearch, MOCK_AGENTS, filterMockAgents } from "../hooks/useRegistry";
import type { MockAgent } from "../hooks/useRegistry";
import AgentCard from "./AgentCard";
import type { DisplayAgent } from "./AgentCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = "reputation" | "calls" | "price";

// ─── Helper: Convert SDK Agent to DisplayAgent ───────────────────────────────

function toDisplayAgent(agent: Agent): DisplayAgent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities,
    priceDisplay: agent.priceDisplay,
    reputationDisplay: agent.reputationDisplay,
    reputation: agent.reputation,
    totalCalls: Number(agent.totalCalls),
    isActive: agent.isActive,
    owner: agent.owner.length > 10
      ? `${agent.owner.slice(0, 4)}...${agent.owner.slice(-4)}`
      : agent.owner,
    registeredAt: new Date(agent.registeredAt * 1000).toISOString().split("T")[0],
  };
}

function mockAgentToDisplayAgent(agent: MockAgent): DisplayAgent {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities,
    priceDisplay: agent.priceDisplay,
    reputationDisplay: agent.reputationDisplay,
    reputation: agent.reputation,
    totalCalls: agent.totalCalls,
    isActive: agent.isActive,
    owner: agent.owner,
    registeredAt: agent.registeredAt,
  };
}

// ─── AgentExplorer ────────────────────────────────────────────────────────────

interface AgentExplorerProps {
  onCreatePolicy?: (agentId: string, agentName: string) => void;
}

export default function AgentExplorer({ onCreatePolicy }: AgentExplorerProps) {
  const [search, setSearch] = useState("");
  const [filterCap, setFilterCap] = useState("");
  const [filterActive, setFilterActive] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("reputation");

  const { agents: onChainAgents, loading, error } = useAgentSearch({
    capability: filterCap || undefined,
    activeOnly: filterActive,
  });

  const usingMock = onChainAgents.length === 0 && !loading;

  const displayAgents = useMemo<DisplayAgent[]>(() => {
    if (onChainAgents.length > 0) {
      const mapped = onChainAgents.map(toDisplayAgent);
      return mapped.sort((a, b) => {
        switch (sortBy) {
          case "reputation":
            return b.reputation - a.reputation;
          case "calls":
            return b.totalCalls - a.totalCalls;
          case "price":
            return parseFloat(a.priceDisplay) - parseFloat(b.priceDisplay);
          default: {
            const _exhaustiveCheck: never = sortBy;
            return _exhaustiveCheck;
          }
        }
      });
    }
    const mockFiltered = filterMockAgents({
      capability: filterCap || undefined,
      activeOnly: filterActive,
      sortBy,
    });
    return mockFiltered.map(mockAgentToDisplayAgent);
  }, [onChainAgents, filterCap, filterActive, sortBy]);

  const filtered = useMemo(() => {
    if (!search) return displayAgents;
    const q = search.toLowerCase();
    return displayAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.capabilities.some((c) => c.includes(q))
    );
  }, [displayAgents, search]);

  const allCapabilities = useMemo(() => {
    return Array.from(
      new Set([...MOCK_AGENTS, ...displayAgents].flatMap((a) => a.capabilities))
    ).sort();
  }, [displayAgents]);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
          Agent Explorer
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
          Browse and discover AI agents registered on the Proxima registry.
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: "200px",
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "#e2e8f0", fontSize: "12px",
            fontFamily: "inherit", outline: "none",
          }}
        />

        <select
          value={filterCap}
          onChange={(e) => setFilterCap(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: filterCap ? "#00c8ff" : "rgba(226,232,240,0.4)",
            fontSize: "12px", fontFamily: "inherit",
            cursor: "pointer", outline: "none",
          }}
        >
          <option value="">All Capabilities</option>
          {allCapabilities.map((cap) => (
            <option key={cap} value={cap} style={{ background: "#0a1520" }}>{cap}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "rgba(226,232,240,0.6)",
            fontSize: "12px", fontFamily: "inherit",
            cursor: "pointer", outline: "none",
          }}
        >
          <option value="reputation" style={{ background: "#0a1520" }}>Sort: Reputation</option>
          <option value="calls" style={{ background: "#0a1520" }}>Sort: Most Used</option>
          <option value="price" style={{ background: "#0a1520" }}>Sort: Cheapest</option>
        </select>

        <button
          onClick={() => setFilterActive(!filterActive)}
          style={{
            padding: "10px 16px",
            background: filterActive ? "rgba(0,255,120,0.1)" : "rgba(255,255,255,0.04)",
            border: filterActive ? "1px solid rgba(0,255,120,0.3)" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: filterActive ? "#00ff78" : "rgba(226,232,240,0.4)",
            cursor: "pointer", fontSize: "12px",
            fontFamily: "inherit", letterSpacing: "0.05em",
          }}
        >
          {filterActive ? "● ACTIVE ONLY" : "○ ACTIVE ONLY"}
        </button>
      </div>

      <div style={{
        fontSize: "11px", color: "rgba(226,232,240,0.3)",
        marginBottom: "16px", letterSpacing: "0.1em",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <span>SHOWING {filtered.length} OF {displayAgents.length} AGENTS</span>
        {loading && (
          <span style={{ color: "rgba(0,200,255,0.4)" }}>LOADING...</span>
        )}
        {error && (
          <span style={{
            fontSize: "9px", padding: "2px 7px",
            background: "rgba(255,64,96,0.08)",
            border: "1px solid rgba(255,64,96,0.2)",
            borderRadius: "4px", color: "rgba(255,64,96,0.6)",
          }}>
            ERROR
          </span>
        )}
        {!loading && usingMock && (
          <span style={{
            fontSize: "9px", padding: "2px 7px",
            background: "rgba(255,184,48,0.08)",
            border: "1px solid rgba(255,184,48,0.2)",
            borderRadius: "4px", color: "rgba(255,184,48,0.6)",
          }}>
            DEMO DATA
          </span>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
        gap: "12px",
      }}>
        {filtered.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onCreatePolicy={onCreatePolicy ?? (() => {})}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "rgba(226,232,240,0.2)", fontSize: "14px",
        }}>
          No agents match your filters.
        </div>
      )}
    </div>
  );
}
