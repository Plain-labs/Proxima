/**
 * WalletConnect.tsx
 *
 * Navbar wallet button.
 * - Freighter not installed → "Connect Wallet" (links to freighter.app)
 * - Installed but not connected → "Connect Wallet" button
 * - Connected → abbreviated address with dropdown
 */

import { useState } from "react";
import { useFreighter } from "../hooks/useFreighter";

function short(addr: string) {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { isInstalled, isConnected, publicKey, network, loading, error, connect, disconnect } =
    useFreighter();
  const [open, setOpen] = useState(false);

  // ── Connected ──────────────────────────────────────────────────────────────
  if (isConnected && publicKey) {
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 12px",
            background: "rgba(56,211,159,0.08)",
            border: "1px solid rgba(56,211,159,0.25)",
            borderRadius: "6px",
            color: "#3dd68c", fontSize: "13px", fontWeight: 500,
            fontFamily: "inherit", cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#3dd68c";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,211,159,0.25)";
          }}
        >
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#3dd68c", boxShadow: "0 0 6px #3dd68c", flexShrink: 0,
          }} />
          <span className="mono">{short(publicKey)}</span>
          <span style={{ color: "#8b949e", fontSize: "10px" }}>▾</span>
        </button>

        {open && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 98 }}
              onClick={() => setOpen(false)}
            />
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              minWidth: "230px", zIndex: 99,
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              overflow: "hidden",
              animation: "fadeUp 0.15s ease",
            }}>
              {/* Account info */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #21262d" }}>
                <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Connected Wallet
                </div>
                <div className="mono" style={{ color: "#e6edf3", wordBreak: "break-all", fontSize: "11px" }}>
                  {publicKey}
                </div>
                {network && (
                  <span className="badge badge--blue" style={{ marginTop: "8px", fontSize: "11px" }}>
                    {network}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: "6px" }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(publicKey); setOpen(false); }}
                  style={menuItemStyle}
                  onMouseEnter={menuHover} onMouseLeave={menuLeave}
                >
                  Copy address
                </button>
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  style={{ ...menuItemStyle, display: "flex", textDecoration: "none", color: "#c9d1d9" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#21262d"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  View on Explorer ↗
                </a>
              </div>

              <div style={{ padding: "6px", borderTop: "1px solid #21262d" }}>
                <button
                  onClick={() => { disconnect(); setOpen(false); }}
                  style={{ ...menuItemStyle, color: "#f85149" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,81,73,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Not installed — show a connect button that opens freighter.app ─────────
  if (!isInstalled) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--blue btn-sm"
        style={{ textDecoration: "none" }}
      >
        Connect Wallet
      </a>
    );
  }

  // ── Installed but not connected ────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button
        onClick={connect}
        disabled={loading}
        className="btn btn--blue btn-sm"
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && (
        <div style={{ fontSize: "11px", color: "#f85149", maxWidth: "200px", textAlign: "right" }}>
          {error}
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  background: "transparent", border: "none", borderRadius: "5px",
  color: "#c9d1d9", fontSize: "13px", fontFamily: "inherit",
  cursor: "pointer", textAlign: "left",
  transition: "background 0.1s",
};

function menuHover(e: React.MouseEvent) {
  (e.currentTarget as HTMLElement).style.background = "#21262d";
}
function menuLeave(e: React.MouseEvent) {
  (e.currentTarget as HTMLElement).style.background = "transparent";
}
