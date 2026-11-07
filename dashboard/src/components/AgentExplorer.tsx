import { useState, useMemo } from "react";
import type { Agent } from "@proxima/sdk";
import { useAgentSearch, MOCK_AGENTS, filterMockAgents } from "../hooks/useRegistry";
import type { MockAgent } from "../hooks/useRegistry";
import AgentCard from "./AgentCard";
import type { DisplayAgent } from "./AgentCard";

// ─── Reputation bar ───────────────────────────────────────────────────────────

function ReputationBar({ score }: { score: number }) {
  const pct = score / 100;
  const color = pct >= 90 ? "#3dd68c" : pct >= 70 ? "#58a6ff" : pct >= 50 ? "#e3b341" : "#f85149";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div className="rep-bar-track">
        <div className="rep-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color, minWidth: "42px", textAlign: "right" }}>
        {(score / 100).toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, onCreatePolicy }: { agent: MockAgent; onCreatePolicy: (id: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`card${agent.isActive ? " card--active" : " card--inactive"} fade-up`}
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: "pointer" }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3" }}>{agent.name}</span>
            {agent.isActive
              ? <span className="badge badge--green">Active</span>
              : <span className="badge badge--gray">Inactive</span>
            }
          </div>
          <div className="mono" style={{ color: "#8b949e", fontSize: "11px", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.id}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#3dd68c" }}>{agent.priceDisplay}</div>
          <div style={{ fontSize: "11px", color: "#8b949e", marginTop: "2px" }}>per call</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "12px", lineHeight: "1.6" }}>
        {agent.description}
      </p>

      {/* Capabilities */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {agent.capabilities.map((cap) => (
          <span key={cap} className="tag">{cap}</span>
        ))}
      </div>

      {/* Reputation */}
      <div style={{ marginTop: "14px" }}>
        <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Reputation
        </div>
        <ReputationBar score={agent.reputation} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="fade-up" style={{ marginTop: "16px" }}>
          <div className="divider" />
          <div className="grid-3" style={{ marginBottom: "14px" }}>
            {[
              { label: "Total Calls", value: agent.totalCalls.toLocaleString() },
              { label: "Registered",  value: agent.registeredAt },
              { label: "Owner",       value: `${agent.owner.slice(0, 8)}…` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                <div className="mono" style={{ fontSize: "12px", color: "#e6edf3" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {agent.isActive && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreatePolicy(agent.id, agent.name); }}
                className="btn btn--primary btn-sm"
              >
                Create Policy →
              </button>
            )}
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${agent.id}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn btn--ghost btn-sm"
              style={{ textDecoration: "none" }}
            >
              Explorer ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
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

  const handleCreatePolicy = (agentId: string, agentName: string) => {
    if (onCreatePolicy) {
      onCreatePolicy(agentId, agentName);
    }
  };

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
          className="form-input"
          style={{ flex: "1 1 200px", maxWidth: "320px" }}
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ width: "160px" }} value={filterCap} onChange={(e) => setFilterCap(e.target.value)}>
          <option value="">All Capabilities</option>
          {allCaps.map((c) => <option key={c} value={c}>{c}</option>)}
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
          className={`btn${filterActive ? " btn--primary" : " btn--ghost"} btn-sm`}
        >
          {filterActive ? "● Active Only" : "○ Active Only"}
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
        <div style={{ textAlign: "center", padding: "60px 0", color: "#484f58", fontSize: "14px" }}>
          No agents match your filters.
        </div>
      )}
    </div>
  );
}
