import { useState } from "react";
import { useEventFeed, type FeedEvent, type EventType } from "../hooks/useEventFeed";

// ─────────────────────────────────────────────────────────────────────────────
// ActivityFeed
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<EventType, string> = {
  payment: "#00c8ff",
  register: "#00ff78",
  policy_create: "#7830ff",
  policy_revoke: "#ff6440",
  reputation: "#ffb830",
  deactivate: "#ff6440",
};

const EVENT_ICONS: Record<EventType, string> = {
  payment: "💸",
  register: "⚡",
  policy_create: "🔐",
  policy_revoke: "🔓",
  reputation: "⭐",
  deactivate: "○",
};

function EventRow({ event, isLatest }: { event: FeedEvent; isLatest: boolean }) {
  const color = EVENT_COLORS[event.type];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "12px 16px",
      background: isLatest ? "rgba(0,200,255,0.04)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isLatest ? "rgba(0,200,255,0.15)" : "rgba(255,255,255,0.04)"}`,
      borderRadius: "7px",
      animation: isLatest ? "fadeIn 0.4s ease" : "none",
      transition: "all 0.3s",
    }}>
      <span style={{ fontSize: "14px", minWidth: "20px" }}>{EVENT_ICONS[event.type]}</span>
      <div style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: color,
        boxShadow: isLatest ? `0 0 8px ${color}` : "none",
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color }}>{event.title}</span>
          {event.amount && (
            <span style={{
              fontSize: "11px", padding: "1px 7px",
              background: "rgba(0,255,120,0.08)",
              border: "1px solid rgba(0,255,120,0.15)",
              borderRadius: "4px", color: "#00ff78",
            }}>
              {event.amount}
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(226,232,240,0.35)", marginTop: "2px" }}>
          {event.detail}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.25)" }}>{event.timestamp}</div>
        <div style={{
          fontSize: "10px", color: "rgba(0,200,255,0.3)",
          marginTop: "2px", fontFamily: "monospace",
        }}>
          {event.txHash}
        </div>
        {event.ledger > 0 && (
          <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.15)", marginTop: "1px" }}>
            ledger {event.ledger.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const [paused, setPaused] = useState(false);
  const { events, live, usingSimulation } = useEventFeed({ paused, maxEvents: 20 });

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: "24px",
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
            Activity Feed
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
            {usingSimulation
              ? "Simulated event stream (connect to testnet for live data)."
              : "Real-time on-chain events from the Proxima contracts."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <span style={{
              width: "6px", height: "6px",
              background: paused ? "rgba(255,255,255,0.2)" : live ? "#00ff78" : "#ffb830",
              borderRadius: "50%",
              boxShadow: (!paused && live) ? "0 0 8px #00ff78" : "none",
              animation: (!paused && live) ? "pulse 2s infinite" : "none",
            }} />
            <span style={{ color: paused ? "rgba(226,232,240,0.3)" : live ? "#00ff78" : "#ffb830" }}>
              {paused ? "PAUSED" : live ? "LIVE" : "CONNECTING..."}
            </span>
            {usingSimulation && !paused && (
              <span style={{ fontSize: "9px", color: "rgba(255,184,48,0.5)", marginLeft: "2px" }}>
                (SIM)
              </span>
            )}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              padding: "7px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "rgba(226,232,240,0.5)",
              cursor: "pointer", fontSize: "11px",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}
          >
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>
        </div>
      </div>

      {events.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "rgba(226,232,240,0.2)", fontSize: "13px",
        }}>
          Waiting for events...
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {events.map((event, i) => (
          <EventRow key={event.id} event={event} isLatest={i === 0} />
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;
