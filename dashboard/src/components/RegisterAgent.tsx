/**
 * RegisterAgent.tsx
 *
 * Multi-step form for registering a new AI agent on-chain.
 * Wired to Freighter wallet: the deploy button builds a real Soroban
 * transaction, requests a signature from Freighter, and submits it to
 * the Stellar testnet via the Proxima SDK.
 */

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

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  description: "",
  capabilities: "",
  pricePerCall: "",
  paymentAsset: "USDC",
  endpointUrl: "",
};

// ─── IdAvailabilityBadge ──────────────────────────────────────────────────────

function IdAvailabilityBadge({ id }: { id: string }) {
  const { exists, checking } = useAgentExists(id);

  if (!id || id.length < 2) return null;

  if (checking) {
    return (
      <span style={{
        fontSize: "10px", padding: "2px 8px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "4px", color: "rgba(226,232,240,0.4)",
        marginLeft: "8px", letterSpacing: "0.06em",
      }}>
        checking...
      </span>
    );
  }

  if (exists === null) return null;

  return exists ? (
    <span style={{
      fontSize: "10px", padding: "2px 8px",
      background: "rgba(255,100,60,0.12)",
      border: "1px solid rgba(255,100,60,0.3)",
      borderRadius: "4px", color: "#ff6440",
      marginLeft: "8px", letterSpacing: "0.06em",
    }}>
      ID TAKEN
    </span>
  ) : (
    <span style={{
      fontSize: "10px", padding: "2px 8px",
      background: "rgba(0,255,120,0.08)",
      border: "1px solid rgba(0,255,120,0.25)",
      borderRadius: "4px", color: "#00ff78",
      marginLeft: "8px", letterSpacing: "0.06em",
    }}>
      AVAILABLE
    </span>
  );
}

// ─── RegisterAgent ────────────────────────────────────────────────────────────

export default function RegisterAgent() {
  const freighter = useFreighter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState<"form" | "preview" | "deploying" | "success" | "error">("form");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const capabilityList = form.capabilities.split(",").map((c) => c.trim()).filter(Boolean);
  const canAdvance = Boolean(form.id && form.name && form.capabilities && form.pricePerCall);

  // ── Deploy handler ──────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!freighter.isConnected || !freighter.publicKey) {
      setErrorMsg("Connect your Freighter wallet first.");
      setStep("error");
      return;
    }

    setStep("deploying");
    setErrorMsg(null);

    try {
      const proxima = getProxima();

      // Build and prepare the register transaction (unsigned)
      const unsignedXdr = await proxima.registry.buildRegisterTx({
        id: form.id,
        name: form.name,
        description: form.description,
        capabilities: capabilityList,
        pricePerCall: form.pricePerCall,
        paymentAsset: form.paymentAsset,
        endpointUrl: form.endpointUrl || "",
        ownerPublicKey: freighter.publicKey,
      });

      // Request Freighter signature
      const signedXdr = await freighter.signTransaction(unsignedXdr);
      if (!signedXdr) throw new Error("Transaction signing was cancelled.");

      // Submit signed XDR and wait for confirmation
      const hash = await proxima.registry.submitSignedTx(signedXdr);
      setTxHash(hash);
      setStep("success");
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Transaction failed.");
      setStep("error");
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeIn 0.5s ease" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚡</div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#00ff78", letterSpacing: "-0.01em" }}>
          Agent Registered on Stellar!
        </h2>
        <p style={{
          fontSize: "13px", color: "rgba(226,232,240,0.5)",
          marginTop: "10px", maxWidth: "420px", margin: "10px auto 0", lineHeight: "1.6",
        }}>
          <strong style={{ color: "#fff" }}>{form.name}</strong> ({form.id}) is now live on the
          Proxima registry and discoverable by the ecosystem.
        </p>

        {txHash && (
          <a
            href={txExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", marginTop: "24px",
              padding: "10px 18px",
              background: "rgba(0,255,120,0.08)",
              border: "1px solid rgba(0,255,120,0.2)",
              borderRadius: "7px",
              fontSize: "11px", color: "rgba(0,200,255,0.7)",
              fontFamily: "monospace", letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            TX: {txHash.slice(0, 8)}...{txHash.slice(-6)} ↗
          </a>
        )}

        <div style={{ marginTop: "24px" }}>
          <button
            onClick={() => { setForm(EMPTY_FORM); setTxHash(null); setStep("form"); }}
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "rgba(226,232,240,0.5)", cursor: "pointer",
              fontSize: "12px", fontFamily: "inherit",
            }}
          >
            Register Another Agent
          </button>
        </div>
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────────────────────

  if (step === "error") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeIn 0.5s ease" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#ff6440" }}>Registration Failed</h2>
        <p style={{
          fontSize: "12px", color: "rgba(226,232,240,0.4)",
          marginTop: "10px", maxWidth: "400px", margin: "10px auto 0", lineHeight: "1.6",
        }}>
          {errorMsg}
        </p>
        <button
          onClick={() => setStep("preview")}
          style={{
            marginTop: "24px", padding: "10px 20px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "rgba(226,232,240,0.5)", cursor: "pointer",
            fontSize: "12px", fontFamily: "inherit",
          }}
        >
          ← Back to Preview
        </button>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────

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

      {/* Wallet warning */}
      {!freighter.isConnected && (
        <div style={{
          marginBottom: "20px", padding: "12px 16px",
          background: "rgba(255,184,48,0.06)",
          border: "1px solid rgba(255,184,48,0.2)",
          borderRadius: "7px",
          fontSize: "11px", color: "rgba(255,184,48,0.8)",
          lineHeight: "1.6",
        }}>
          ⚠️ Connect your Freighter wallet (top-right) to deploy on-chain. You can still preview the form without a wallet.
        </div>
      )}

      {/* Progress steps */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
        {["Details", "Preview", "Deploy"].map((s, i) => {
          const idx = step === "form" ? 0 : step === "preview" ? 1 : 2;
          const active = i === idx;
          const done = i < idx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: done ? "#00ff78" : active ? "rgba(0,200,255,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${done ? "#00ff78" : active ? "rgba(0,200,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "600",
                color: done ? "#000" : active ? "#00c8ff" : "rgba(226,232,240,0.3)",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "11px", color: active ? "#00c8ff" : "rgba(226,232,240,0.3)", letterSpacing: "0.05em" }}>
                {s}
              </span>
              {i < 2 && <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Details ── */}
      {step === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.3s ease" }}>
          {/* Agent ID with availability check */}
          <div>
            <label style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", letterSpacing: "0.12em", display: "flex", alignItems: "center", marginBottom: "6px" }}>
              AGENT ID *
              <IdAvailabilityBadge id={form.id} />
            </label>
            <input
              placeholder="my-agent-v1  (unique, lowercase, hyphens ok)"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
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

          {/* Remaining fields */}
          {[
            { key: "name" as const, label: "DISPLAY NAME *", placeholder: "My AI Agent" },
            { key: "description" as const, label: "DESCRIPTION *", placeholder: "What does your agent do?", multiline: true },
            { key: "capabilities" as const, label: "CAPABILITIES *", placeholder: "text-generation, summarization, translation  (comma-separated)" },
            { key: "pricePerCall" as const, label: "PRICE PER CALL (USDC) *", placeholder: "0.0100" },
            { key: "endpointUrl" as const, label: "ENDPOINT URL", placeholder: "https://my-agent-api.com/v1  (optional)" },
          ].map(({ key, label, placeholder, multiline }) => (
            <div key={key}>
              <label style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
                {label}
              </label>
              {multiline ? (
                <textarea
                  rows={3}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#e2e8f0", fontSize: "12px",
                    fontFamily: "inherit", outline: "none", resize: "vertical",
                  }}
                />
              ) : (
                <input
                  placeholder={placeholder}
                  value={form[key]}
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
            disabled={!canAdvance}
            style={{
              marginTop: "8px", padding: "13px",
              background: "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(120,48,255,0.2))",
              border: "1px solid rgba(0,200,255,0.4)",
              borderRadius: "7px",
              color: "#00c8ff", cursor: canAdvance ? "pointer" : "not-allowed",
              fontSize: "13px", fontFamily: "inherit",
              fontWeight: "600", letterSpacing: "0.08em",
              opacity: canAdvance ? 1 : 0.4,
            }}
          >
            PREVIEW REGISTRATION →
          </button>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
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
              {form.description || <em style={{ opacity: 0.4 }}>No description provided.</em>}
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
            {form.endpointUrl && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "rgba(0,200,255,0.5)" }}>
                🌐 {form.endpointUrl}
              </div>
            )}
          </div>

          {/* Signing note */}
          <div style={{
            padding: "10px 14px", marginBottom: "14px",
            background: "rgba(0,200,255,0.04)",
            border: "1px solid rgba(0,200,255,0.1)",
            borderRadius: "6px",
            fontSize: "11px", color: "rgba(0,200,255,0.5)", lineHeight: "1.6",
          }}>
            {freighter.isConnected
              ? `⚡ Signing as ${freighter.publicKey?.slice(0, 8)}...${freighter.publicKey?.slice(-6)}  (${freighter.network ?? "testnet"})`
              : "⚠️ Wallet not connected — connect Freighter to deploy on-chain."}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleDeploy}
              disabled={!freighter.isConnected}
              style={{
                flex: 1, padding: "13px",
                background: freighter.isConnected
                  ? "linear-gradient(135deg, #00c8ff22, #7830ff22)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${freighter.isConnected ? "rgba(0,200,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "7px",
                color: freighter.isConnected ? "#00c8ff" : "rgba(226,232,240,0.3)",
                cursor: freighter.isConnected ? "pointer" : "not-allowed",
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

      {/* ── Step 3: Deploying ── */}
      {step === "deploying" && (
        <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeIn 0.4s ease" }}>
          <div style={{
            width: "48px", height: "48px", margin: "0 auto 20px",
            border: "3px solid rgba(0,200,255,0.2)",
            borderTop: "3px solid #00c8ff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{ fontSize: "14px", color: "#00c8ff", fontWeight: "600" }}>
            Deploying to Stellar...
          </p>
          <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.35)", marginTop: "8px" }}>
            Approve the transaction in Freighter, then wait for on-chain confirmation.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
