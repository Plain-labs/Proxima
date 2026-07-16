import { useState, useEffect } from "react";
import { MOCK_POLICIES, type MockPolicy } from "../hooks/usePolicy";

interface PolicyManagerProps {
  /** Pre-fill the create form from the Agent Explorer */
  prefill?: { agentId: string; agentName: string } | null;
  /** Called once the prefill data has been consumed and the form is shown */
  onPrefillConsumed?: () => void;
}

function PolicyCard({ policy, onRevoke }: { policy: MockPolicy; onRevoke: (id: string) => void }) {
  const spentPct = parseFloat(policy.spentToday) / parseFloat(policy.dailyLimit) * 100;
  const barColor = spentPct > 80 ? "#ff6440" : spentPct > 50 ? "#ffb830" : "#00c8ff";

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${policy.isActive ? "rgba(0,200,255,0.12)" : "rgba(255,255,255,0.05)"}`,
      borderRadius: "10px",
      padding: "20px",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>
              {policy.agentName}
            </span>
            <span style={{
              fontSize: "9px", padding: "2px 7px",
              background: policy.isActive ? "rgba(0,255,120,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${policy.isActive ? "rgba(0,255,120,0.25)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "4px",
              color: policy.isActive ? "#00ff78" : "rgba(226,232,240,0.3)",
              letterSpacing: "0.1em",
            }}>
              {policy.isActive ? "ACTIVE" : "REVOKED"}
            </span>
          </div>
          <div style={{ fontSize: "10px", color: "rgba(0,200,255,0.45)", marginTop: "3px", letterSpacing: "0.05em" }}>
            {policy.id} · Agent: {policy.agent}
          </div>
        </div>
        {policy.isActive && (
          <button
            onClick={() => onRevoke(policy.id)}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid rgba(255,100,60,0.3)",
              borderRadius: "5px",
              color: "rgba(255,100,60,0.7)",
              cursor: "pointer",
              fontSize: "10px",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
            }}
          >
            REVOKE
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px", marginTop: "16px",
      }}>
        {[
          { label: "MAX / TX", value: policy.maxPerTx },
          { label: "DAILY LIMIT", value: policy.dailyLimit },
          { label: "TOTAL TXNS", value: policy.txCount.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: "6px", padding: "10px",
          }}>
            <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", letterSpacing: "0.12em" }}>{label}</div>
            <div style={{ fontSize: "13px", color: "#e2e8f0", marginTop: "4px", fontWeight: "600" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Daily spend bar */}
      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)", letterSpacing: "0.1em" }}>
            TODAY'S SPEND
          </span>
          <span style={{ fontSize: "10px", color: barColor }}>
            {policy.spentToday} / {policy.dailyLimit}
          </span>
        </div>
        <div style={{
          height: "4px", background: "rgba(255,255,255,0.06)",
          borderRadius: "2px", overflow: "hidden",
        }}>
          <div style={{
            width: `${spentPct}%`, height: "100%",
            background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
            boxShadow: `0 0 8px ${barColor}`,
            borderRadius: "2px",
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.25)", marginTop: "4px" }}>
          {policy.remainingToday} remaining today · {policy.totalSpent} total spent
        </div>
      </div>
    </div>
  );
}

function CreatePolicyForm({
  onClose,
  prefill,
}: {
  onClose: () => void;
  prefill?: { agentId: string; agentName: string } | null;
}) {
  const [form, setForm] = useState({
    agent: prefill?.agentId ?? "",
    maxPerTx: "",
    dailyLimit: "",
    asset: "USDC",
  });

  return (
    <div style={{
      background: "rgba(5,10,20,0.95)",
      border: "1px solid rgba(0,200,255,0.2)",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", letterSpacing: "0.05em" }}>
          CREATE SPENDING POLICY
        </h3>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "rgba(226,232,240,0.4)",
          cursor: "pointer", fontSize: "18px",
        }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        {[
          { key: "agent", label: prefill ? `AGENT ADDRESS  (pre-filled: ${prefill.agentName})` : "AGENT ADDRESS", placeholder: "GBKR...2XPL", full: true },
          { key: "maxPerTx", label: "MAX PER TRANSACTION", placeholder: "0.50" },
          { key: "dailyLimit", label: "DAILY LIMIT", placeholder: "10.00" },
        ].map(({ key, label, placeholder, full }) => (
          <div key={key} style={{ gridColumn: full ? "1/-1" : "auto" }}>
            <label style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
              {label}
            </label>
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
          </div>
        ))}

        <div>
          <label style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
            PAYMENT ASSET
          </label>
          <select
            value={form.asset}
            onChange={(e) => setForm({ ...form, asset: e.target.value })}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#e2e8f0", fontSize: "12px",
              fontFamily: "inherit", outline: "none", cursor: "pointer",
            }}
          >
            <option value="USDC" style={{ background: "#0a1520" }}>USDC</option>
            <option value="XLM" style={{ background: "#0a1520" }}>XLM</option>
          </select>
        </div>
      </div>

      <div style={{
        marginTop: "16px",
        padding: "12px 14px",
        background: "rgba(0,200,255,0.05)",
        border: "1px solid rgba(0,200,255,0.12)",
        borderRadius: "6px",
        fontSize: "11px",
        color: "rgba(0,200,255,0.6)",
        lineHeight: "1.6",
      }}>
        ⚡ Once created, the authorized agent can spend autonomously within these limits — no signature required per transaction. You can revoke this policy at any time.
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button style={{
          flex: 1, padding: "12px",
          background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(120,48,255,0.2))",
          border: "1px solid rgba(0,200,255,0.4)",
          borderRadius: "6px",
          color: "#00c8ff", cursor: "pointer",
          fontSize: "12px", fontFamily: "inherit",
          fontWeight: "600", letterSpacing: "0.08em",
        }}>
          DEPLOY POLICY ON STELLAR
        </button>
        <button onClick={onClose} style={{
          padding: "12px 20px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          color: "rgba(226,232,240,0.4)", cursor: "pointer",
          fontSize: "12px", fontFamily: "inherit",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PolicyManager({ prefill, onPrefillConsumed }: PolicyManagerProps) {
  const [policies, setPolicies] = useState(MOCK_POLICIES);
  const [showForm, setShowForm] = useState(false);

  // Auto-open the create form when navigating here from AgentExplorer
  useEffect(() => {
    if (prefill) {
      setShowForm(true);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  const handleRevoke = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => p.id === id ? { ...p, isActive: false } : p)
    );
  };

  const active = policies.filter((p) => p.isActive).length;

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: "24px",
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
            Spending Policies
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
            Manage autonomous payment authorizations for your AI agents.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, rgba(0,200,255,0.15), rgba(120,48,255,0.15))",
            border: "1px solid rgba(0,200,255,0.35)",
            borderRadius: "7px",
            color: "#00c8ff", cursor: "pointer",
            fontSize: "12px", fontFamily: "inherit",
            letterSpacing: "0.08em", fontWeight: "600",
          }}
        >
          + NEW POLICY
        </button>
      </div>

      {/* Summary */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px", marginBottom: "24px",
      }}>
        {[
          { label: "ACTIVE POLICIES", value: active, color: "#00ff78" },
          { label: "TOTAL POLICIES", value: policies.length, color: "#00c8ff" },
          { label: "TOTAL TRANSACTED", value: "$270.00", color: "#7830ff" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${color}20`,
            borderRadius: "8px", padding: "16px 20px",
          }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color }}>{value}</div>
            <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)", marginTop: "4px", letterSpacing: "0.12em" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {showForm && <CreatePolicyForm onClose={() => setShowForm(false)} prefill={prefill} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} onRevoke={handleRevoke} />
        ))}
      </div>
    </div>
  );
}
