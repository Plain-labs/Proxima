import { useState } from "react";
import { useAgents, MOCK_AGENTS } from "../hooks/useRegistry";
import type { MockAgent } from "../hooks/useRegistry";

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
}

// ─── AgentExplorer ────────────────────────────────────────────────────────────

interface AgentExplorerProps {
  onCreatePolicy?: (agentId: string, agentName: string) => void;
}

export default function AgentExplorer({ onCreatePolicy }: AgentExplorerProps) {
  const [search,      setSearch]      = useState("");
  const [filterCap,   setFilterCap]   = useState("");
  const [filterActive,setFilterActive]= useState(false);
  const [sortBy,      setSortBy]      = useState<"reputation" | "calls" | "price">("reputation");

  const { agents, loading, usingMock } = useAgents({ capability: filterCap || undefined, activeOnly: filterActive, sortBy });

  const filtered = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.capabilities.some((c) => c.includes(q));
  });

  const allCaps = Array.from(new Set([...MOCK_AGENTS, ...agents].flatMap((a) => a.capabilities))).sort();

  return (
    <div>
      {/* Header */}
      <h1 className="page-title">Agent Explorer</h1>
      <p className="page-subtitle">Browse AI agents registered on the Proxima registry.</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
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
        <select className="form-select" style={{ width: "160px" }} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="reputation">Sort: Reputation</option>
          <option value="calls">Sort: Most Used</option>
          <option value="price">Sort: Cheapest</option>
        </select>
        <button
          onClick={() => setFilterActive(!filterActive)}
          className={`btn${filterActive ? " btn--primary" : " btn--ghost"} btn-sm`}
        >
          {filterActive ? "● Active Only" : "○ Active Only"}
        </button>
      </div>

      {/* Status row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span style={{ fontSize: "12px", color: "#8b949e" }}>
          Showing <strong style={{ color: "#e6edf3" }}>{filtered.length}</strong> of {agents.length} agents
        </span>
        {loading && <span className="badge badge--blue">Loading…</span>}
        {!loading && usingMock && <span className="badge badge--yellow">Demo data</span>}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "12px" }}>
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
