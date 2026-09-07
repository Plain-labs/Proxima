import { useState } from "react";
import { useFreighter } from "../hooks/useFreighter";
import { useAgentExists } from "../hooks/useRegistry";
import { getProxima, txExplorerUrl } from "../lib/proxima";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  id: string;
  name: string;
  description: string;
  capabilities: string;
  pricePerCall: string;
  paymentAsset: string;
  endpointUrl: string;
}

const EMPTY: FormState = {
  id: "", name: "", description: "",
  capabilities: "", pricePerCall: "",
  paymentAsset: "USDC", endpointUrl: "",
};

// ─── ID availability badge ────────────────────────────────────────────────────

function IdBadge({ id }: { id: string }) {
  const { exists, checking } = useAgentExists(id);
  if (!id || id.length < 2) return null;
  if (checking) return <span className="badge badge--gray">Checking…</span>;
  if (exists === null) return null;
  return exists
    ? <span className="badge badge--red">ID taken</span>
    : <span className="badge badge--green">Available</span>;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ["Details", "Preview", "Deploy"];
  return (
    <div className="step-row">
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className={`step-dot step-dot--${done ? "done" : active ? "active" : "idle"}`}>
              {done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "12px", fontWeight: active ? 600 : 400, color: active ? "#58a6ff" : done ? "#8b949e" : "#484f58" }}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── RegisterAgent ────────────────────────────────────────────────────────────

export default function RegisterAgent() {
  const freighter = useFreighter();
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [step, setStep]       = useState<"form" | "preview" | "deploying" | "success" | "error">("form");
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);

  const caps       = form.capabilities.split(",").map((c) => c.trim()).filter(Boolean);
  const canAdvance = Boolean(form.id && form.name && form.capabilities && form.pricePerCall);

  // ── Deploy ──────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!freighter.isConnected || !freighter.publicKey) {
      setErrMsg("Connect your wallet first."); setStep("error"); return;
    }
    setStep("deploying"); setErrMsg(null);
    try {
      const proxima  = getProxima();
      const unsigned = await proxima.registry.buildRegisterTx({
        id: form.id, name: form.name, description: form.description,
        capabilities: caps, pricePerCall: form.pricePerCall,
        paymentAsset: form.paymentAsset, endpointUrl: form.endpointUrl || "",
        ownerPublicKey: freighter.publicKey,
      });
      const signed = await freighter.signTransaction(unsigned);
      if (!signed) throw new Error("Signing cancelled.");
      const hash = await proxima.registry.submitSignedTx(signed);
      setTxHash(hash); setStep("success");
    } catch (e) {
      setErrMsg((e as Error).message ?? "Transaction failed."); setStep("error");
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="fade-up" style={{ maxWidth: "520px", margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: "42px", marginBottom: "16px" }}>🎉</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e6edf3", marginBottom: "8px" }}>
          Agent Registered
        </h2>
        <p style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.6 }}>
          <strong style={{ color: "#e6edf3" }}>{form.name}</strong> ({form.id}) is live on the
          Proxima registry and discoverable by the ecosystem.
        </p>
        {txHash && (
          <a
            href={txExplorerUrl(txHash)}
            target="_blank" rel="noopener noreferrer"
            className="btn btn--ghost"
            style={{ margin: "20px auto 0", textDecoration: "none", display: "inline-flex" }}
          >
            <span className="mono">{txHash.slice(0, 8)}…{txHash.slice(-6)}</span>
            <span>↗</span>
          </a>
        )}
        <div style={{ marginTop: "12px" }}>
          <button
            onClick={() => { setForm(EMPTY); setTxHash(null); setStep("form"); }}
            className="btn btn--ghost"
          >
            Register another agent
          </button>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (step === "error") {
    return (
      <div className="fade-up" style={{ maxWidth: "480px", margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#e6edf3", marginBottom: "8px" }}>
          Registration Failed
        </h2>
        <p style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.6 }}>{errMsg}</p>
        <button onClick={() => setStep("preview")} className="btn btn--ghost" style={{ marginTop: "20px" }}>
          ← Back to Preview
        </button>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "680px" }}>
      <h1 className="page-title">Register Agent</h1>
      <p className="page-subtitle">Publish your AI agent to the on-chain Proxima registry.</p>

      {!freighter.isConnected && (
        <div className="alert alert--warning" style={{ marginBottom: "20px" }}>
          Connect your wallet (top-right) to deploy on-chain. You can still preview without a wallet.
        </div>
      )}

      <Steps current={step === "form" ? 0 : step === "preview" ? 1 : 2} />

      {/* ── Step 1: Details ── */}
      {step === "form" && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Agent ID */}
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              Agent ID *
              <IdBadge id={form.id} />
            </label>
            <input
              className="form-input"
              placeholder="my-agent-v1  (unique, lowercase, hyphens ok)"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            />
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Display Name *</label>
            <input className="form-input" placeholder="My AI Agent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} placeholder="What does your agent do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Capabilities */}
          <div className="form-group">
            <label className="form-label">Capabilities * <span style={{ fontWeight: 400, textTransform: "none", color: "#484f58" }}>(comma-separated)</span></label>
            <input className="form-input" placeholder="text-generation, summarization, translation" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} />
          </div>

          {/* Price + Asset */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Price Per Call (USDC) *</label>
              <input className="form-input" placeholder="0.0100" value={form.pricePerCall} onChange={(e) => setForm({ ...form, pricePerCall: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Asset</label>
              <select className="form-select" value={form.paymentAsset} onChange={(e) => setForm({ ...form, paymentAsset: e.target.value })}>
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </select>
            </div>
          </div>

          {/* Endpoint URL */}
          <div className="form-group">
            <label className="form-label">Endpoint URL <span style={{ fontWeight: 400, textTransform: "none", color: "#484f58" }}>(optional)</span></label>
            <input className="form-input" placeholder="https://my-agent-api.com/v1" value={form.endpointUrl} onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })} />
          </div>

          <button onClick={() => setStep("preview")} disabled={!canAdvance} className="btn btn--primary btn-lg" style={{ marginTop: "4px", opacity: canAdvance ? 1 : 0.4 }}>
            Preview Registration →
          </button>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === "preview" && (
        <div className="fade-up">
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#e6edf3" }}>{form.name}</div>
            <div className="mono" style={{ fontSize: "11px", color: "#8b949e", marginTop: "3px" }}>{form.id}</div>

            {form.description && (
              <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "10px", lineHeight: 1.6 }}>{form.description}</p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
              {caps.map((c) => <span key={c} className="tag">{c}</span>)}
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#3dd68c" }}>{form.pricePerCall} {form.paymentAsset}</span>
              <span style={{ fontSize: "12px", color: "#8b949e" }}>per call</span>
            </div>

            {form.endpointUrl && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#8b949e" }}>🌐 {form.endpointUrl}</div>
            )}
          </div>

          {/* Signer note */}
          <div className={`alert ${freighter.isConnected ? "alert--info" : "alert--warning"}`} style={{ marginBottom: "16px" }}>
            {freighter.isConnected
              ? `Signing as ${freighter.publicKey?.slice(0, 8)}…${freighter.publicKey?.slice(-6)}`
              : "Wallet not connected — connect Freighter to deploy on-chain."}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleDeploy} disabled={!freighter.isConnected} className="btn btn--primary btn-lg" style={{ flex: 1 }}>
              Deploy to Stellar
            </button>
            <button onClick={() => setStep("form")} className="btn btn--ghost btn-lg">
              ← Edit
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Deploying ── */}
      {step === "deploying" && (
        <div className="fade-up" style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner" style={{ marginBottom: "20px" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#e6edf3" }}>Deploying to Stellar…</p>
          <p style={{ fontSize: "12px", color: "#8b949e", marginTop: "6px" }}>
            Approve the transaction in Freighter, then wait for confirmation.
          </p>
        </div>
      )}
    </div>
  );
}
