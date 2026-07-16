/**
 * WalletConnect.tsx
 *
 * Header wallet button that integrates with Freighter.
 * Shows:
 *  - "Install Freighter" link when extension is missing
 *  - "Connect Wallet" button when not connected
 *  - Abbreviated public key + disconnect option when connected
 */

import { useState } from 'react';
import { useFreighter } from '../hooks/useFreighter';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { isInstalled, isConnected, publicKey, network, loading, error, connect, disconnect } =
    useFreighter();
  const [showMenu, setShowMenu] = useState(false);

  // ── Not installed ─────────────────────────────────────────────────────────
  if (!isInstalled) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 14px',
          background: 'rgba(255,184,48,0.08)',
          border: '1px solid rgba(255,184,48,0.25)',
          borderRadius: '20px',
          fontSize: '11px', color: '#ffb830',
          letterSpacing: '0.08em',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span>⚡</span>
        INSTALL FREIGHTER
      </a>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  if (isConnected && publicKey) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 14px',
            background: 'rgba(0,255,120,0.08)',
            border: '1px solid rgba(0,255,120,0.25)',
            borderRadius: '20px',
            fontSize: '11px', color: '#00ff78',
            letterSpacing: '0.08em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{
            width: '6px', height: '6px',
            background: '#00ff78', borderRadius: '50%',
            boxShadow: '0 0 8px #00ff78',
          }} />
          {truncateAddress(publicKey)}
          <span style={{ opacity: 0.5, fontSize: '9px' }}>▾</span>
        </button>

        {showMenu && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: '220px',
            background: 'rgba(8,16,28,0.98)',
            border: '1px solid rgba(0,200,255,0.15)',
            borderRadius: '10px',
            padding: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 100,
            animation: 'fadeIn 0.15s ease',
          }}>
            {/* Address */}
            <div style={{
              padding: '8px 10px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '6px',
            }}>
              <div style={{ fontSize: '9px', color: 'rgba(226,232,240,0.3)', letterSpacing: '0.12em', marginBottom: '4px' }}>
                CONNECTED WALLET
              </div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {publicKey}
              </div>
              {network && (
                <div style={{
                  marginTop: '6px', display: 'inline-block',
                  padding: '2px 7px',
                  background: 'rgba(0,200,255,0.08)',
                  border: '1px solid rgba(0,200,255,0.15)',
                  borderRadius: '4px',
                  fontSize: '9px', color: '#00c8ff',
                  letterSpacing: '0.1em',
                }}>
                  {network}
                </div>
              )}
            </div>

            {/* Copy address */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicKey);
                setShowMenu(false);
              }}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'transparent',
                border: 'none', borderRadius: '6px',
                color: 'rgba(226,232,240,0.6)',
                cursor: 'pointer', fontSize: '11px',
                fontFamily: 'inherit', textAlign: 'left',
                letterSpacing: '0.05em',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              📋 Copy address
            </button>

            {/* View on Explorer */}
            <a
              href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '6px',
                color: 'rgba(226,232,240,0.6)',
                fontSize: '11px', letterSpacing: '0.05em',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              ↗ View on Explorer
            </a>

            {/* Disconnect */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '6px', paddingTop: '6px' }}>
              <button
                onClick={() => { disconnect(); setShowMenu(false); }}
                style={{
                  width: '100%', padding: '8px 10px',
                  background: 'transparent',
                  border: 'none', borderRadius: '6px',
                  color: 'rgba(255,100,60,0.7)',
                  cursor: 'pointer', fontSize: '11px',
                  fontFamily: 'inherit', textAlign: 'left',
                  letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,100,60,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                ✕ Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Click-outside to close menu */}
        {showMenu && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={connect}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 14px',
          background: loading ? 'rgba(0,200,255,0.04)' : 'rgba(0,200,255,0.1)',
          border: '1px solid rgba(0,200,255,0.3)',
          borderRadius: '20px',
          fontSize: '11px', color: loading ? 'rgba(0,200,255,0.4)' : '#00c8ff',
          letterSpacing: '0.08em',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>◌</span>
            CONNECTING...
          </>
        ) : (
          <>⚡ CONNECT WALLET</>
        )}
      </button>
      {error && (
        <div style={{ fontSize: '10px', color: '#ff6440', maxWidth: '200px', textAlign: 'right' }}>
          {error}
        </div>
      )}
    </div>
  );
}
