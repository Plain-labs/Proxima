import { useState } from "react";
import { useEventFeed, type FeedEvent, type EventType } from "../hooks/useEventFeed";

const EVENT_LABELS: Record<EventType, string> = {
  payment:       "Payment",
  register:      "Agent Registered",
  policy_create: "Policy Created",
  policy_revoke: "Policy Revoked",
  reputation:    "Reputation Updated",
  deactivate:    "Agent Deactivated",
};

const EVENT_BADGE: Record<EventType, string> = {
  payment:       "badge--blue",
  register:      "badge--green",
  policy_create: "badge--purple",
  policy_revoke: "badge--red",
  reputation:    "badge--yellow",
  deactivate:    "badge--gray",
};

function EventRow({ event, isLatest }: { event: FeedEvent; isLatest: boolean }) {
  return (
    <div
      className={`card${isLatest ? " card--active" : ""} fade-up`}
      style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px 16px" }}
    >
      {/* Left: type badge */}
      <div style={{ flexShrink: 0, paddingTop: "1px" }}>
        <span className={`badge ${EVENT_BADGE[event.type]}`}>{EVENT_LABELS[event.type]}</span>
      </div>

      {/* Middle: content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#e6edf3" }}>{event.title}</span>
          {event.amount && <span className="badge badge--green">{event.amount}</span>}
        </div>
        <div style={{ fontSize: "12px", color: "#8b949e", marginTop: "3px" }}>{event.detail}</div>
      </div>

      {/* Right: meta */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "11px", color: "#8b949e" }}>{event.timestamp}</div>
        {event.txHash && (
          <div className="mono" style={{ fontSize: "10px", color: "#484f58", marginTop: "2px" }}>{event.txHash}</div>
        )}
        {event.ledger > 0 && (
          <div style={{ fontSize: "10px", color: "#484f58", marginTop: "1px" }}>ledger {event.ledger.toLocaleString()}</div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", gap: "16px" }}>
        <div>
          <h1 className="page-title">Activity Feed</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {usingSimulation
              ? "Simulated events — connect to testnet for live data."
              : "Real-time on-chain events from the Proxima contracts."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
              background: paused ? "#484f58" : live ? "#3dd68c" : "#e3b341",
              boxShadow: (!paused && live) ? "0 0 6px #3dd68c" : "none",
              animation: (!paused && live) ? "pulse 2.5s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: "12px", color: paused ? "#484f58" : live ? "#3dd68c" : "#e3b341" }}>
              {paused ? "Paused" : live ? "Live" : "Connecting…"}
            </span>
            {usingSimulation && !paused && (
              <span className="badge badge--yellow" style={{ fontSize: "10px" }}>Sim</span>
            )}
          </div>

          <button onClick={() => setPaused((p) => !p)} className="btn btn--ghost btn-sm">
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#484f58", fontSize: "14px" }}>
          Waiting for events…
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {events.map((event, i) => (
          <EventRow key={event.id} event={event} isLatest={i === 0} />
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;
