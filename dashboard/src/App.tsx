import { useState } from "react";
import AgentExplorer from "./components/AgentExplorer";
import PolicyManager from "./components/PolicyManager";
import RegisterAgent from "./components/RegisterAgent";
import ActivityFeed from "./components/ActivityFeed";

type Tab = "explore" | "register" | "policies" | "activity";

/** Passed from AgentExplorer → App → PolicyManager to pre-fill the create form */
export interface PolicyPrefill {
  agentId: string;
  agentName: string;
}

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "explore", label: "Agent Explorer", icon: "⚡" },
  { id: "register", label: "Register Agent", icon: "＋" },
  { id: "policies", label: "Spending Policies", icon: "🔐" },
  { id: "activity", label: "Activity Feed", icon: "📡" },
];

// Mock stats for demonstration
const STATS = [
  { label: "Registered Agents", value: "148", delta: "+12 this week" },
  { label: "Active Policies", value: "2,341", delta: "+89 today" },
  { label: "USDC Transacted", value: "$48,291", delta: "last 24h" },
  { label: "Avg Reputation", value: "87.4%", delta: "across all agents" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [policyPrefill, setPolicyPrefill] = useState<PolicyPrefill | null>(null);

  /** Navigate to Policy Manager with agent pre-filled */
  const handleCreatePolicy = (agentId: string, agentName: string) => {
    setPolicyPrefill({ agentId, agentName });
    setActiveTab("policies");
  };

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Courier New', monospace",
      background: "#050a0f",
      minHeight: "100vh",
      color: "#e2e8f0",
    }}>
      {/* Animated background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Glow orbs */}
      <div style={{
        position: "fixed", top: "-20%", left: "10%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(0,180,255,0.07) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "-10%", right: "5%",
        width: "500px", height: "500px",
        background: "radial-gradient(circle, rgba(120,60,255,0.06) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ── */}
      <header style={{
        position: "relative", zIndex: 10,
        borderBottom: "1px solid rgba(0,200,255,0.12)",
        background: "rgba(5,10,15,0.85)",
        backdropFilter: "blur(12px)",
        padding: "0 2rem",
      }}>
        <div style={{
          maxWidth: "1400px", margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "64px",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "linear-gradient(135deg, #00c8ff 0%, #7830ff 100%)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", fontWeight: "bold",
              boxShadow: "0 0 20px rgba(0,200,255,0.4)",
            }}>S</div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "0.05em", color: "#fff" }}>
                PROXIMA
              </div>
              <div style={{ fontSize: "10px", color: "rgba(0,200,255,0.7)", letterSpacing: "0.15em" }}>
                AI AGENT REGISTRY
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: "4px" }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: "8px 16px",
                  background: activeTab === item.id
                    ? "rgba(0,200,255,0.12)"
                    : "transparent",
                  border: activeTab === item.id
                    ? "1px solid rgba(0,200,255,0.3)"
                    : "1px solid transparent",
                  borderRadius: "6px",
                  color: activeTab === item.id ? "#00c8ff" : "rgba(226,232,240,0.5)",
                  cursor: "pointer",
                  fontSize: "12px",
                  letterSpacing: "0.05em",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Network badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 14px",
            background: "rgba(0,255,120,0.08)",
            border: "1px solid rgba(0,255,120,0.2)",
            borderRadius: "20px",
            fontSize: "11px",
            color: "#00ff78",
            letterSpacing: "0.1em",
          }}>
            <span style={{
              width: "6px", height: "6px",
              background: "#00ff78",
              borderRadius: "50%",
              boxShadow: "0 0 8px #00ff78",
              animation: "pulse 2s infinite",
            }} />
            STELLAR TESTNET
          </div>
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <div style={{
        position: "relative", zIndex: 5,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(255,255,255,0.02)",
        padding: "0 2rem",
      }}>
        <div style={{
          maxWidth: "1400px", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
        }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{
              padding: "16px 24px",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", letterSpacing: "0.1em", marginTop: "2px" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "10px", color: "rgba(0,200,255,0.5)", marginTop: "4px" }}>
                {stat.delta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main style={{
        position: "relative", zIndex: 5,
        maxWidth: "1400px", margin: "0 auto",
        padding: "2rem",
      }}>
        {activeTab === "explore" && <AgentExplorer onCreatePolicy={handleCreatePolicy} />}
        {activeTab === "register" && <RegisterAgent />}
        {activeTab === "policies" && (
          <PolicyManager
            prefill={policyPrefill}
            onPrefillConsumed={() => setPolicyPrefill(null)}
          />
        )}
        {activeTab === "activity" && <ActivityFeed />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
