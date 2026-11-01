import { useState, useRef, useMemo } from "react";
import type { Agent } from "@proxima/sdk";
import { useAgentSearch, MOCK_AGENTS, filterMockAgents } from "../hooks/useRegistry";
import type { MockAgent } from "../hooks/useRegistry";
import ReputationSparkline from "./ReputationSparkline";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = "reputation" | "calls" | "price";

interface AgentCardProps {
  agent: DisplayAgent;
  onCreatePolicy: (agentId: string, agentName: string) => void;
}

/**
 * Unified agent display type that works with both on-chain Agent and MockAgent data.
 */
interface DisplayAgent {
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

// ─── ReputationBar ────────────────────────────────────────────────────────────

function ReputationBar({ score }: { score: number }) {
  const pct = score / 100;
  const color =
    pct >= 90 ? "#00ff78" : pct >= 75 ? "#00c8ff" : pct >= 60 ? "#ffb830" : "#ff4060";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1, height: "3px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          borderRadius: "2px",
          transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: "11px", color, fontWeight: "600", minWidth: "44px" }}>
        {(score / 100).toFixed(2)}%
      </span>
    </div>
  );
}

// ─── Mock history generator ──────────────────────────────────────────────────

function generateMockHistory(currentScore: number, totalCalls: number): number[] {
  const COUNT = 20;
  const stability = Math.min(totalCalls / 5000, 1);
  const maxNoise = (1 - stability) * 800 + 80;

  const points: number[] = [currentScore];
  let cursor = currentScore;

  for (let i = 1; i < COUNT; i++) {
    const noise = (Math.random() - 0.48) * maxNoise;
    cursor = Math.max(0, Math.min(10000, cursor - noise));
    points.unshift(cursor);
  }

  return points;
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onCreatePolicy }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const historyRef = useRef<number[] | null>(null);
  if (expanded && !historyRef.current) {
    historyRef.current = generateMockHistory(agent.reputation, agent.totalCalls);
  }

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${agent.isActive ? "rgba(0,200,255,0.15)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "10px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s",
        animation: "fadeIn 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(0,200,255,0.05)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,200,255,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLDivElement).style.borderColor = agent.isActive
          ? "rgba(0,200,255,0.15)"
          : "rgba(255,255,255,0.06)";
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "3px", height: "100%",
        background: agent.isActive
          ? "linear-gradient(180deg, #00c8ff, #7830ff)"
          : "rgba(255,255,255,0.1)",
      }} />

      <div style={{ paddingLeft: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                {agent.name}
              </span>
              {!agent.isActive && (
                <span style={{
                  fontSize: "9px", padding: "2px 6px",
                  background: "rgba(255,100,60,0.15)",
                  border: "1px solid rgba(255,100,60,0.3)",
                  borderRadius: "4px", color: "#ff6440",
                  letterSpacing: "0.1em",
                }}>INACTIVE</span>
              )}
            </div>
            <div style={{
              fontSize: "10px", color: "rgba(0,200,255,0.5)",
              marginTop: "2px", letterSpacing: "0.05em",
            }}>
              {agent.id}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#00ff78" }}>
              {agent.priceDisplay}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)", marginTop: "2px" }}>
              per call
            </div>
          </div>
        </div>

        <p style={{
          fontSize: "12px", color: "rgba(226,232,240,0.55)",
          marginTop: "10px", lineHeight: "1.6",
        }}>
          {agent.description}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
          {agent.capabilities.map((cap) => (
            <span key={cap} style={{
              fontSize: "10px", padding: "3px 8px",
              background: "rgba(120,48,255,0.15)",
              border: "1px solid rgba(120,48,255,0.25)",
              borderRadius: "4px", color: "rgba(180,140,255,0.9)",
              letterSpacing: "0.05em",
            }}>
              {cap}
            </span>
          ))}
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{
            fontSize: "10px", color: "rgba(226,232,240,0.3)",
            marginBottom: "4px", letterSpacing: "0.1em",
          }}>
            REPUTATION
          </div>
          <ReputationBar score={agent.reputation} />
        </div>

        {expanded && (() => {
          const history = historyRef.current!;
          const last = history[history.length - 1];
          const weekSlice = history.slice(-5);
          const weekDelta = weekSlice[weekSlice.length - 1] - weekSlice[0];
          const weekPct = ((weekDelta / (weekSlice[0] || 1)) * 100).toFixed(1);
          const isUp = weekDelta > 0;
          const isDown = weekDelta < 0;
          const trendArrow = isUp ? "↑" : isDown ? "↓" : "→";
          const trendColor = isUp ? "#00ff78" : isDown ? "#ff4060" : "#00c8ff";
          const trendLabel = `${trendArrow} ${isDown ? "" : "+"}${weekPct}% this week`;
          const currentPct = (last / 100).toFixed(2);

          return (
            <div style={{
              marginTop: "16px",
              padding: "14px",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              animation: "fadeIn 0.2s ease",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {[
                  { label: "TOTAL CALLS", value: agent.totalCalls.toLocaleString() },
                  { label: "REGISTERED", value: agent.registeredAt },
                  { label: "OWNER", value: agent.owner },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{
                      fontSize: "9px", color: "rgba(226,232,240,0.3)",
                      letterSpacing: "0.12em",
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  fontSize: "9px", color: "rgba(226,232,240,0.3)",
                  letterSpacing: "0.12em", marginBottom: "10px",
                }}>
                  REPUTATION HISTORY (last 30 interactions)
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ReputationSparkline
                      history={history}
                      width={300}
                      height={44}
                    />
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: "14px", fontWeight: "700",
                      color: trendColor, lineHeight: 1,
                    }}>
                      {currentPct}%
                    </div>
                    <div style={{
                      fontSize: "10px", color: trendColor,
                      opacity: 0.75, marginTop: "4px",
                    }}>
                      {trendLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                {agent.isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreatePolicy(agent.id, agent.name);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, rgba(0,200,255,0.15), rgba(120,48,255,0.15))",
                      border: "1px solid rgba(0,200,255,0.3)",
                      borderRadius: "6px",
                      color: "#00c8ff",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "inherit",
                      letterSpacing: "0.08em",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "linear-gradient(135deg, rgba(0,200,255,0.25), rgba(120,48,255,0.25))";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "linear-gradient(135deg, rgba(0,200,255,0.15), rgba(120,48,255,0.15))";
                    }}
                  >
                    🔐 CREATE SPENDING POLICY →
                  </button>
                )}
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${agent.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    color: "rgba(226,232,240,0.35)",
                    fontSize: "11px",
                    fontFamily: "inherit",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  ↗ EXPLORER
                </a>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

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
            onCreatePolicy={handleCreatePolicy}
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
