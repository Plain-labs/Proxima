import { useState, useEffect } from "react";
import { MOCK_POLICIES, type MockPolicy } from "../hooks/usePolicy";
import { useFreighter } from "../hooks/useFreighter";
import { getProxima, txExplorerUrl, NETWORK_INFO } from "../lib/proxima";

interface PolicyManagerProps {
  prefill?: { agentId: string; agentName: string } | null;
  onPrefillConsumed?: () => void;
}

// ─── PolicyCard ───────────────────────────────────────────────────────────────

function PolicyCard({ policy, onRevoke, revoking }: { policy: MockPolicy; onRevoke: (id: string) => void; revoking: boolean }) {
  const spentPct = (parseFloat(policy.spentToday) / parseFloat(policy.dailyLimit)) * 100;
  const barColor = spentPct > 80 ? "#f85149" : spentPct > 50 ? "#e3b341" : "#58a6ff";

  return (
    <div className={`card${!policy.isActive ? " card--inactive" : ""} fade-up`}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3" }}>{policy.agentName}</span>
            {policy.isActive
              ? <span className="badge badge--green">Active</span>
              : <span className="badge badge--gray">Revoked</span>
            }
          </div>
          <div className="mono" style={{ fontSize: "11px", color: "#8b949e", marginTop: "3px" }}>
            {policy.id} · Agent: {policy.agent}
          </div>
        </div>
        {policy.isActive && (
          <button
            onClick={() => onRevoke(policy.id)}
            disabled={revoking}
            className="btn btn--danger btn-sm"
            style={{ flexShrink: 0, opacity: revoking ? 0.5 : 1 }}
          >
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginTop: "16px" }}>
        {[
          { label: "Max / Tx",    value: policy.maxPerTx     },
          { label: "Daily Limit", value: policy.dailyLimit   },
          { label: "Total Txns",  value: policy.txCount.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#0d1117", borderRadius: "6px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3", marginTop: "3px" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Daily spend bar */}
      <div style={{ marginTop: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Today's Spend</span>
          <span style={{ fontSize: "12px", color: barColor, fontWeight: 500 }}>{policy.spentToday} / {policy.dailyLimit}</span>
        </div>
        <div style={{ height: "4px", background: "#21262d", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ width: `${spentPct}%`, height: "100%", background: barColor, borderRadius: "2px", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontSize: "11px", color: "#484f58", marginTop: "4px" }}>
          {policy.remainingToday} remaining · {policy.totalSpent} total
        </div>
      </div>
    </div>
  );
}

// ─── CreatePolicyForm ─────────────────────────────────────────────────────────

function CreatePolicyForm({ onClose, onSuccess, prefill }: {
  onClose: () => void;
  onSuccess: (txHash: string) => void;
  prefill?: { agentId: string; agentName: string } | null;
}) {
  const freighter = useFreighter();
  const [form, setForm] = useState({ agent: prefill?.agentId ?? "", maxPerTx: "", dailyLimit: "", asset: "USDC" });
  const [status, setStatus]   = useState<"idle" | "busy" | "error">("idle");
  const [errMsg, setErrMsg]   = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!freighter.isConnected || !freighter.publicKey) { setErrMsg("Connect your wallet first."); setStatus("error"); return; }
    if (!form.agent || !form.maxPerTx || !form.dailyLimit) { setErrMsg("Fill in all required fields."); setStatus("error"); return; }
    setStatus("busy"); setErrMsg(null);
    try {
      const proxima  = getProxima();
      const issuer   = NETWORK_INFO.testnet.policyContractId;
      const unsigned = await proxima.policy.buildCreatePolicyTx({ agent: form.agent, maxPerTx: form.maxPerTx, dailyLimit: form.dailyLimit, asset: form.asset, issuer, ownerPublicKey: freighter.publicKey });
      const signed   = await freighter.signTransaction(unsigned);
      if (!signed) throw new Error("Signing cancelled.");
      const hash     = await proxima.policy.submitSignedTx(signed);
      onSuccess(hash);
    } catch (e) {
      setErrMsg((e as Error).message ?? "Transaction failed.");
      setStatus("error");
    }
  };

  return (
    <div className="card fade-up" style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e6edf3" }}>Create Spending Policy</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
      </div>

      {!freighter.isConnected && (
        <div className="alert alert--warning" style={{ marginBottom: "16px" }}>
          Connect your wallet to deploy on-chain.
        </div>
      )}

      <div className="grid-2" style={{ rowGap: "14px" }}>
        <div className="form-group col-span-2">
          <label className="form-label">{prefill ? `Agent Address (prefilled: ${prefill.agentName})` : "Agent Address"}</label>
          <input className="form-input" placeholder="GBKR...2XPL" value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Per Transaction (USDC)</label>
          <input className="form-input" placeholder="0.50" value={form.maxPerTx} onChange={(e) => setForm({ ...form, maxPerTx: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Daily Limit (USDC)</label>
          <input className="form-input" placeholder="10.00" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Asset</label>
          <select className="form-select" value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })}>
            <option value="USDC">USDC</option>
            <option value="XLM">XLM</option>
          </select>
        </div>
      </div>

      <div className="alert alert--info" style={{ marginTop: "16px" }}>
        Once created, the agent can spend autonomously within these limits. You can revoke at any time.
      </div>

      {status === "error" && errMsg && (
        <div className="alert alert--error" style={{ marginTop: "12px" }}>{errMsg}</div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button onClick={handleDeploy} disabled={status === "busy" || !freighter.isConnected} className="btn btn--primary btn-lg" style={{ flex: 1 }}>
          {status === "busy" ? "Deploying…" : "Deploy Policy"}
        </button>
        <button onClick={onClose} className="btn btn--ghost btn-lg">Cancel</button>
      </div>
    </div>
  );
}

// ─── PolicyManager ────────────────────────────────────────────────────────────

export default function PolicyManager({ prefill, onPrefillConsumed }: PolicyManagerProps) {
  const freighter = useFreighter();
  const [policies,   setPolicies]   = useState(MOCK_POLICIES);
  const [showForm,   setShowForm]   = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [successTx,  setSuccessTx]  = useState<string | null>(null);

  useEffect(() => { if (prefill) { setShowForm(true); onPrefillConsumed?.(); } }, [prefill, onPrefillConsumed]);

  const handleRevoke = async (id: string) => {
    if (!freighter.isConnected) { alert("Connect your wallet to revoke a policy."); return; }
    setRevokingId(id);
    await new Promise((r) => setTimeout(r, 800));
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)));
    setRevokingId(null);
  };

  const handleCreateSuccess = (hash: string) => {
    setShowForm(false); setSuccessTx(hash);
    setTimeout(() => setSuccessTx(null), 10_000);
  };

  const active = policies.filter((p) => p.isActive).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", gap: "16px" }}>
        <div>
          <h1 className="page-title">Spending Policies</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage autonomous payment authorizations for your agents.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn--primary" style={{ flexShrink: 0 }}>
          + New Policy
        </button>
      </div>

      {successTx && (
        <div className="alert alert--success fade-up" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Policy deployed on Stellar!</span>
          <a href={txExplorerUrl(successTx)} target="_blank" rel="noopener noreferrer" className="mono" style={{ color: "#58a6ff", fontSize: "11px", textDecoration: "none" }}>
            {successTx.slice(0, 8)}…{successTx.slice(-6)} ↗
          </a>
        </div>
      )}

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: "24px" }}>
        {[
          { label: "Active Policies",   value: active,            color: "#3dd68c" },
          { label: "Total Policies",    value: policies.length,   color: "#58a6ff" },
          { label: "Total Transacted",  value: "$270",            color: "#a371f7" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ borderColor: `${color}20` }}>
            <div style={{ fontSize: "26px", fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: "11px", color: "#8b949e", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {showForm && <CreatePolicyForm onClose={() => setShowForm(false)} onSuccess={handleCreateSuccess} prefill={prefill} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} onRevoke={handleRevoke} revoking={revokingId === policy.id} />
        ))}
      </div>
    </div>
  );
}
