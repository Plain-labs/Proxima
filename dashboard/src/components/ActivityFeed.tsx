import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ActivityFeed
// ─────────────────────────────────────────────────────────────────────────────

interface FeedEvent {
  id: string;
  type: "payment" | "register" | "policy" | "reputation" | "deactivate";
  title: string;
  detail: string;
  amount?: string;
  time: string;
  txHash: string;
}

const BASE_EVENTS: FeedEvent[] = [
  { id: "1", type: "payment", title: "Payment Executed", detail: "POL-002 · Web Search Agent → GCTP...8MNQ", amount: "0.0050 USDC", time: "2s ago", txHash: "e8f2a1...d4c9" },
  { id: "2", type: "payment", title: "Payment Executed", detail: "POL-001 · Flux Image Generator → GABC...1ZXP", amount: "0.0500 USDC", time: "8s ago", txHash: "a9b3c2...f1e8" },
  { id: "3", type: "register", title: "Agent Registered", detail: "llama-3-inference-v1 · by GDXK...A3MN", time: "1m ago", txHash: "3d7e91...b2a4" },
  { id: "4", type: "reputation", title: "Reputation Updated", detail: "whisper-transcription-v1 → 96.10%", time: "2m ago", txHash: "7c4f12...e9d3" },
  { id: "5", type: "policy", title: "Policy Created", detail: "POL-004 · Daily limit: 20 USDC · Agent: GAMT...5PQR", time: "4m ago", txHash: "2b8e45...a7f1" },
  { id: "6", type: "payment", title: "Payment Executed", detail: "POL-001 · Flux Image Generator → GBKR...9MXQ", amount: "0.0500 USDC", time: "5m ago", txHash: "9f3c71...d2b8" },
  { id: "7", type: "payment", title: "Payment Executed", detail: "POL-002 · Web Search Agent → GCTP...3LNM", amount: "0.0050 USDC", time: "5m ago", txHash: "4a7d23...c6e9" },
  { id: "8", type: "register", title: "Agent Registered", detail: "stable-diffusion-xl-v2 · by GFRM...2QTL", time: "12m ago", txHash: "1e9b56...f4a2" },
  { id: "9", type: "policy", title: "Policy Revoked", detail: "POL-003 revoked by owner GCTP...7QMN", time: "18m ago", txHash: "8d2c34...b1f7" },
  { id: "10", type: "deactivate", title: "Agent Deactivated", detail: "data-enrichment-v1 · owner GDBR...9YKL", time: "32m ago", txHash: "5f1a89...e3c4" },
];

const EVENT_COLORS: Record<FeedEvent["type"], string> = {
  payment: "#00c8ff",
  register: "#00ff78",
  policy: "#7830ff",
  reputation: "#ffb830",
  deactivate: "#ff6440",
};

const EVENT_ICONS: Record<FeedEvent["type"], string> = {
  payment: "💸",
  register: "⚡",
  policy: "🔐",
  reputation: "⭐",
  deactivate: "○",
};

export function ActivityFeed() {
  const [events, setEvents] = useState(BASE_EVENTS);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const newEvent: FeedEvent = {
        id: Date.now().toString(),
        type: "payment",
        title: "Payment Executed",
        detail: `POL-00${Math.floor(Math.random() * 3) + 1} · Auto-payment → G${Math.random().toString(36).slice(2, 6).toUpperCase()}...${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        amount: `${(Math.random() * 0.05 + 0.005).toFixed(4)} USDC`,
        time: "just now",
        txHash: `${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}`,
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    }, 3500);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
            Activity Feed
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
            Real-time stream of on-chain events from the Proxima contracts.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#00ff78" }}>
            <span style={{
              width: "6px", height: "6px",
              background: paused ? "rgba(255,255,255,0.2)" : "#00ff78",
              borderRadius: "50%",
              boxShadow: paused ? "none" : "0 0 8px #00ff78",
              animation: paused ? "none" : "pulse 2s infinite",
            }} />
            {paused ? "PAUSED" : "LIVE"}
          </div>
          <button
            onClick={() => setPaused(!paused)}
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

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {events.map((event, i) => {
          const color = EVENT_COLORS[event.type];
          return (
            <div key={event.id} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "12px 16px",
              background: i === 0 ? "rgba(0,200,255,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${i === 0 ? "rgba(0,200,255,0.15)" : "rgba(255,255,255,0.04)"}`,
              borderRadius: "7px",
              animation: i === 0 ? "fadeIn 0.4s ease" : "none",
              transition: "all 0.3s",
            }}>
              <span style={{ fontSize: "14px", minWidth: "20px" }}>{EVENT_ICONS[event.type]}</span>
              <div style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: color,
                boxShadow: i === 0 ? `0 0 8px ${color}` : "none",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: color }}>
                    {event.title}
                  </span>
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
                <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.25)" }}>{event.time}</div>
                <div style={{ fontSize: "10px", color: "rgba(0,200,255,0.3)", marginTop: "2px", fontFamily: "monospace" }}>
                  {event.txHash}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterAgent
// ─────────────────────────────────────────────────────────────────────────────

export function RegisterAgent() {
  const [form, setForm] = useState({
    id: "", name: "", description: "",
    capabilities: "", pricePerCall: "",
    paymentAsset: "USDC", endpointUrl: "",
  });
  const [step, setStep] = useState<"form" | "preview" | "success">("form");

  const capabilityList = form.capabilities.split(",").map((c) => c.trim()).filter(Boolean);

  if (step === "success") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeIn 0.5s ease" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚡</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#00ff78", letterSpacing: "-0.01em" }}>
          Agent Registered on Stellar!
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)", marginTop: "10px", maxWidth: "400px", margin: "10px auto 0" }}>
          Your agent <strong style={{ color: "#fff" }}>{form.id}</strong> is now live on the Proxima registry and discoverable by the ecosystem.
        </p>
        <div style={{
          marginTop: "24px", display: "inline-block",
          padding: "10px 18px",
          background: "rgba(0,255,120,0.1)",
          border: "1px solid rgba(0,255,120,0.25)",
          borderRadius: "7px",
          fontSize: "11px", color: "rgba(0,200,255,0.6)",
          fontFamily: "monospace", letterSpacing: "0.05em",
        }}>
          TX: 0x3d7e91...b2a4 · Ledger: 54,891,203
        </div>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => { setForm({ id:"",name:"",description:"",capabilities:"",pricePerCall:"",paymentAsset:"USDC",endpointUrl:"" }); setStep("form"); }}
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "rgba(226,232,240,0.5)", cursor: "pointer",
              fontSize: "12px", fontFamily: "inherit",
            }}
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
          Register Agent
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
          Publish your AI agent to the on-chain Proxima registry.
        </p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
        {["Details", "Preview", "Deploy"].map((s, i) => {
          const idx = step === "form" ? 0 : step === "preview" ? 1 : 2;
          const active = i === idx;
          const done = i < idx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "24px", height: "24px",
                borderRadius: "50%",
                background: done ? "#00ff78" : active ? "rgba(0,200,255,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${done ? "#00ff78" : active ? "rgba(0,200,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "600",
                color: done ? "#000" : active ? "#00c8ff" : "rgba(226,232,240,0.3)",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "11px", color: active ? "#00c8ff" : "rgba(226,232,240,0.3)", letterSpacing: "0.05em" }}>{s}</span>
              {i < 2 && <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>

      {step === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.3s ease" }}>
          {[
            { key: "id", label: "AGENT ID *", placeholder: "my-agent-v1  (unique, lowercase, hyphens ok)" },
            { key: "name", label: "DISPLAY NAME *", placeholder: "My AI Agent" },
            { key: "description", label: "DESCRIPTION *", placeholder: "What does your agent do?", multiline: true },
            { key: "capabilities", label: "CAPABILITIES *", placeholder: "text-generation, summarization, translation  (comma-separated)" },
            { key: "pricePerCall", label: "PRICE PER CALL (USDC) *", placeholder: "0.0100" },
            { key: "endpointUrl", label: "ENDPOINT URL", placeholder: "https://my-agent-api.com/v1  (optional)" },
          ].map(({ key, label, placeholder, multiline }) => (
            <div key={key}>
              <label style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
                {label}
              </label>
              {multiline ? (
                <textarea
                  rows={3}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#e2e8f0", fontSize: "12px",
                    fontFamily: "inherit", outline: "none",
                    resize: "vertical",
                  }}
                />
              ) : (
                <input
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#e2e8f0", fontSize: "12px",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
              )}
            </div>
          ))}

          <button
            onClick={() => setStep("preview")}
            disabled={!form.id || !form.name || !form.capabilities || !form.pricePerCall}
            style={{
              marginTop: "8px",
              padding: "13px",
              background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(120,48,255,0.2))",
              border: "1px solid rgba(0,200,255,0.4)",
              borderRadius: "7px",
              color: "#00c8ff", cursor: "pointer",
              fontSize: "13px", fontFamily: "inherit",
              fontWeight: "600", letterSpacing: "0.08em",
              opacity: (!form.id || !form.name || !form.capabilities || !form.pricePerCall) ? 0.4 : 1,
            }}
          >
            PREVIEW REGISTRATION →
          </button>
        </div>
      )}

      {step === "preview" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{
            background: "rgba(0,200,255,0.05)",
            border: "1px solid rgba(0,200,255,0.15)",
            borderRadius: "10px", padding: "20px",
            marginBottom: "16px",
          }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>{form.name}</div>
            <div style={{ fontSize: "11px", color: "rgba(0,200,255,0.5)", marginTop: "3px" }}>{form.id}</div>
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.55)", marginTop: "10px", lineHeight: "1.6" }}>
              {form.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
              {capabilityList.map((cap) => (
                <span key={cap} style={{
                  fontSize: "10px", padding: "3px 8px",
                  background: "rgba(120,48,255,0.15)",
                  border: "1px solid rgba(120,48,255,0.25)",
                  borderRadius: "4px", color: "rgba(180,140,255,0.9)",
                }}>
                  {cap}
                </span>
              ))}
            </div>
            <div style={{ marginTop: "14px", fontSize: "13px", color: "#00ff78", fontWeight: "600" }}>
              {form.pricePerCall} {form.paymentAsset} per call
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setStep("success")}
              style={{
                flex: 1, padding: "13px",
                background: "linear-gradient(135deg, #00c8ff22, #7830ff22)",
                border: "1px solid rgba(0,200,255,0.4)",
                borderRadius: "7px",
                color: "#00c8ff", cursor: "pointer",
                fontSize: "13px", fontFamily: "inherit",
                fontWeight: "600", letterSpacing: "0.08em",
              }}
            >
              ⚡ DEPLOY TO STELLAR
            </button>
            <button
              onClick={() => setStep("form")}
              style={{
                padding: "13px 20px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "7px",
                color: "rgba(226,232,240,0.4)", cursor: "pointer",
                fontSize: "12px", fontFamily: "inherit",
              }}
            >
              ← Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
