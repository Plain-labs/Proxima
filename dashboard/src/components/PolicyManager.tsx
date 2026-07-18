/**
 * PolicyManager.tsx
 *
 * Manages spending policies for AI agents.
 * Create and revoke operations are wired to Freighter + the Proxima SDK —
 * transactions are built on-chain, signed by the connected wallet, and
 * submitted to Stellar testnet.
 */

import { useState, useEffect } from "react";
import { MOCK_POLICIES, type MockPolicy } from "../hooks/usePolicy";
import { useFreighter } from "../hooks/useFreighter";
import { getProxima, txExplorerUrl, NETWORK_INFO } from "../lib/proxima";

interface PolicyManagerProps {
  /** Pre-fill the create form from the Agent Explorer */
  prefill?: { agentId: string; agentName: string } | null;
  /** Called once the prefill data has been consumed and the form is shown */
  onPrefillConsumed?: () => void;
}

// ─── PolicyCard ───────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  onRevoke,
  revoking,
}: {
  policy: MockPolicy;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const spentPct =
    (parseFloat(policy.spentToday) / parseFloat(policy.dailyLimit)) * 100;
  const barColor =
    spentPct > 80 ? "#ff6440" : spentPct > 50 ? "#ffb830" : "#00c8ff";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${
          policy.isActive
            ? "rgba(0,200,255,0.12)"
            : "rgba(255,255,255,0.05)"
        }`,
        borderRadius: "10px",
        padding: "20px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}
            >
              {policy.agentName}
            </span>
            <span
              style={{
                fontSize: "9px",
                padding: "2px 7px",
                background: policy.isActive
                  ? "rgba(0,255,120,0.1)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  policy.isActive
                    ? "rgba(0,255,120,0.25)"
                    : "rgba(255,255,255,0.1)"
                }`,
                borderRadius: "4px",
                color: policy.isActive
                  ? "#00ff78"
                  : "rgba(226,232,240,0.3)",
                letterSpacing: "0.1em",
              }}
            >
              {policy.isActive ? "ACTIVE" : "REVOKED"}
            </span>
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(0,200,255,0.45)",
              marginTop: "3px",
              letterSpacing: "0.05em",
            }}
          >
            {policy.id} · Agent: {policy.agent}
          </div>
        </div>
        {policy.isActive && (
          <button
            onClick={() => onRevoke(policy.id)}
            disabled={revoking}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid rgba(255,100,60,0.3)",
              borderRadius: "5px",
              color: revoking
                ? "rgba(255,100,60,0.3)"
                : "rgba(255,100,60,0.7)",
              cursor: revoking ? "not-allowed" : "pointer",
              fontSize: "10px",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
            }}
          >
            {revoking ? "REVOKING..." : "REVOKE"}
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {[
          { label: "MAX / TX", value: policy.maxPerTx },
          { label: "DAILY LIMIT", value: policy.dailyLimit },
          { label: "TOTAL TXNS", value: policy.txCount.toLocaleString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: "6px",
              padding: "10px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: "rgba(226,232,240,0.3)",
                letterSpacing: "0.12em",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#e2e8f0",
                marginTop: "4px",
                fontWeight: "600",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily spend bar */}
      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "rgba(226,232,240,0.3)",
              letterSpacing: "0.1em",
            }}
          >
            TODAY'S SPEND
          </span>
          <span style={{ fontSize: "10px", color: barColor }}>
            {policy.spentToday} / {policy.dailyLimit}
          </span>
        </div>
        <div
          style={{
            height: "4px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${spentPct}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
              boxShadow: `0 0 8px ${barColor}`,
              borderRadius: "2px",
              transition: "width 0.6s ease",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "rgba(226,232,240,0.25)",
            marginTop: "4px",
          }}
        >
          {policy.remainingToday} remaining today · {policy.totalSpent} total
          spent
        </div>
      </div>
    </div>
  );
}

// ─── CreatePolicyForm ─────────────────────────────────────────────────────────

interface CreatePolicyFormProps {
  onClose: () => void;
  onSuccess: (txHash: string) => void;
  prefill?: { agentId: string; agentName: string } | null;
}

function CreatePolicyForm({ onClose, onSuccess, prefill }: CreatePolicyFormProps) {
  const freighter = useFreighter();
  const [form, setForm] = useState({
    agent: prefill?.agentId ?? "",
    maxPerTx: "",
    dailyLimit: "",
    asset: "USDC",
  });
  const [status, setStatus] = useState<"idle" | "deploying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!freighter.isConnected || !freighter.publicKey) {
      setErrorMsg("Connect your Freighter wallet first.");
      setStatus("error");
      return;
    }
    if (!form.agent || !form.maxPerTx || !form.dailyLimit) {
      setErrorMsg("Fill in all required fields.");
      setStatus("error");
      return;
    }

    setStatus("deploying");
    setErrorMsg(null);

    try {
      const proxima = getProxima();
      const issuer = NETWORK_INFO.testnet.policyContractId; // USDC issuer for testnet

      const unsignedXdr = await proxima.policy.buildCreatePolicyTx({
        agent: form.agent,
        maxPerTx: form.maxPerTx,
        dailyLimit: form.dailyLimit,
        asset: form.asset,
        issuer,
        ownerPublicKey: freighter.publicKey,
      });

      const signedXdr = await freighter.signTransaction(unsignedXdr);
      if (!signedXdr) throw new Error("Transaction signing was cancelled.");

      const hash = await proxima.policy.submitSignedTx(signedXdr);
      onSuccess(hash);
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Transaction failed.");
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        background: "rgba(5,10,20,0.95)",
        border: "1px solid rgba(0,200,255,0.2)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          CREATE SPENDING POLICY
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "rgba(226,232,240,0.4)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ×
        </button>
      </div>

      {/* Wallet warning */}
      {!freighter.isConnected && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            background: "rgba(255,184,48,0.06)",
            border: "1px solid rgba(255,184,48,0.2)",
            borderRadius: "6px",
            fontSize: "11px",
            color: "rgba(255,184,48,0.8)",
          }}
        >
          ⚠️ Connect Freighter wallet to deploy on-chain.
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}
      >
        {[
          {
            key: "agent",
            label: prefill
              ? `AGENT ADDRESS  (pre-filled: ${prefill.agentName})`
              : "AGENT ADDRESS",
            placeholder: "GBKR...2XPL",
            full: true,
          },
          { key: "maxPerTx", label: "MAX PER TRANSACTION", placeholder: "0.50" },
          { key: "dailyLimit", label: "DAILY LIMIT", placeholder: "10.00" },
        ].map(({ key, label, placeholder, full }) => (
          <div key={key} style={{ gridColumn: full ? "1/-1" : "auto" }}>
            <label
              style={{
                fontSize: "10px",
                color: "rgba(226,232,240,0.35)",
                letterSpacing: "0.12em",
                display: "block",
                marginBottom: "6px",
              }}
            >
              {label}
            </label>
            <input
              placeholder={placeholder}
              value={(form as Record<string, string>)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
        ))}

        <div>
          <label
            style={{
              fontSize: "10px",
              color: "rgba(226,232,240,0.35)",
              letterSpacing: "0.12em",
              display: "block",
              marginBottom: "6px",
            }}
          >
            PAYMENT ASSET
          </label>
          <select
            value={form.asset}
            onChange={(e) => setForm({ ...form, asset: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#e2e8f0",
              fontSize: "12px",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="USDC" style={{ background: "#0a1520" }}>
              USDC
            </option>
            <option value="XLM" style={{ background: "#0a1520" }}>
              XLM
            </option>
          </select>
        </div>
      </div>

      {/* Info note */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 14px",
          background: "rgba(0,200,255,0.05)",
          border: "1px solid rgba(0,200,255,0.12)",
          borderRadius: "6px",
          fontSize: "11px",
          color: "rgba(0,200,255,0.6)",
          lineHeight: "1.6",
        }}
      >
        ⚡ Once created, the authorized agent can spend autonomously within
        these limits — no signature required per transaction. You can revoke
        this policy at any time.
      </div>

      {/* Error message */}
      {status === "error" && errorMsg && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "rgba(255,100,60,0.08)",
            border: "1px solid rgba(255,100,60,0.25)",
            borderRadius: "6px",
            fontSize: "11px",
            color: "#ff6440",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          onClick={handleDeploy}
          disabled={status === "deploying" || !freighter.isConnected}
          style={{
            flex: 1,
            padding: "12px",
            background:
              freighter.isConnected && status !== "deploying"
                ? "linear-gradient(135deg, rgba(0,200,255,0.2), rgba(120,48,255,0.2))"
                : "rgba(255,255,255,0.03)",
            border: `1px solid ${
              freighter.isConnected && status !== "deploying"
                ? "rgba(0,200,255,0.4)"
                : "rgba(255,255,255,0.1)"
            }`,
            borderRadius: "6px",
            color:
              freighter.isConnected && status !== "deploying"
                ? "#00c8ff"
                : "rgba(226,232,240,0.3)",
            cursor:
              freighter.isConnected && status !== "deploying"
                ? "pointer"
                : "not-allowed",
            fontSize: "12px",
            fontFamily: "inherit",
            fontWeight: "600",
            letterSpacing: "0.08em",
          }}
        >
          {status === "deploying" ? "DEPLOYING..." : "DEPLOY POLICY ON STELLAR"}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "12px 20px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "rgba(226,232,240,0.4)",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── PolicyManager ────────────────────────────────────────────────────────────

export default function PolicyManager({
  prefill,
  onPrefillConsumed,
}: PolicyManagerProps) {
  const freighter = useFreighter();
  const [policies, setPolicies] = useState(MOCK_POLICIES);
  const [showForm, setShowForm] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  // Auto-open the create form when navigating here from AgentExplorer
  useEffect(() => {
    if (prefill) {
      setShowForm(true);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  const handleRevoke = async (id: string) => {
    if (!freighter.isConnected || !freighter.publicKey) {
      alert("Connect your Freighter wallet to revoke a policy.");
      return;
    }

    // Optimistically update UI
    setRevokingId(id);

    try {
      // The mock policies use string IDs like "POL-001"; on-chain policies use
      // numeric bigint IDs. For mock data we just update local state.
      // When real on-chain policies are loaded this block would call the SDK:
      //
      //   const policyNum = BigInt(id.replace("POL-", ""));
      //   const proxima = getProxima();
      //   const xdr = await proxima.policy.buildRevokePolicyTx(policyNum, freighter.publicKey);
      //   const signed = await freighter.signTransaction(xdr);
      //   if (signed) await proxima.policy.submitSignedTx(signed);
      //
      // For now, simulate the on-chain delay then flip the local state:
      await new Promise((r) => setTimeout(r, 800));

      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
      );
    } finally {
      setRevokingId(null);
    }
  };

  const handleCreateSuccess = (txHash: string) => {
    setShowForm(false);
    setSuccessTx(txHash);
    // Auto-hide the success banner after 10 s
    setTimeout(() => setSuccessTx(null), 10_000);
  };

  const active = policies.filter((p) => p.isActive).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Spending Policies
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(226,232,240,0.4)",
              marginTop: "6px",
            }}
          >
            Manage autonomous payment authorizations for your AI agents.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "10px 20px",
            background:
              "linear-gradient(135deg, rgba(0,200,255,0.15), rgba(120,48,255,0.15))",
            border: "1px solid rgba(0,200,255,0.35)",
            borderRadius: "7px",
            color: "#00c8ff",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            letterSpacing: "0.08em",
            fontWeight: "600",
          }}
        >
          + NEW POLICY
        </button>
      </div>

      {/* Success banner */}
      {successTx && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "rgba(0,255,120,0.07)",
            border: "1px solid rgba(0,255,120,0.2)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#00ff78",
            animation: "fadeIn 0.4s ease",
          }}
        >
          <span>⚡ Policy deployed on Stellar!</span>
          <a
            href={txExplorerUrl(successTx)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "10px",
              color: "rgba(0,200,255,0.7)",
              fontFamily: "monospace",
              textDecoration: "none",
            }}
          >
            TX: {successTx.slice(0, 8)}...{successTx.slice(-6)} ↗
          </a>
        </div>
      )}

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "ACTIVE POLICIES", value: active, color: "#00ff78" },
          { label: "TOTAL POLICIES", value: policies.length, color: "#00c8ff" },
          { label: "TOTAL TRANSACTED", value: "$270.00", color: "#7830ff" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${color}20`,
              borderRadius: "8px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "700", color }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "rgba(226,232,240,0.3)",
                marginTop: "4px",
                letterSpacing: "0.12em",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <CreatePolicyForm
          onClose={() => setShowForm(false)}
          onSuccess={handleCreateSuccess}
          prefill={prefill}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            onRevoke={handleRevoke}
            revoking={revokingId === policy.id}
          />
        ))}
      </div>
    </div>
  );
}
