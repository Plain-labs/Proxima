import { useState, useRef } from "react";
import ReputationSparkline from "./ReputationSparkline";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Unified agent display type that works with both on-chain Agent and MockAgent data.
 * Used by AgentCard and AgentExplorer to avoid a direct SDK type dependency in the card.
 */
export interface DisplayAgent {
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

interface AgentCardProps {
  agent: DisplayAgent;
  onCreatePolicy: (agentId: string, agentName: string) => void;
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

/**
 * A card component that displays a single AI agent's metadata.
 *
 * Clicking the card expands it to show reputation history (sparkline),
 * total calls, owner, and action buttons (Create Policy, Explorer link).
 *
 * @example
 * ```tsx
 * <AgentCard
 *   agent={displayAgent}
 *   onCreatePolicy={(id, name) => navigateToPolicies(id, name)}
 * />
 * ```
 */
export default function AgentCard({ agent, onCreatePolicy }: AgentCardProps) {
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
                  { label: "REGISTERED",  value: agent.registeredAt },
                  { label: "OWNER",       value: agent.owner },
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
                    <ReputationSparkline history={history} width={300} height={44} />
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
