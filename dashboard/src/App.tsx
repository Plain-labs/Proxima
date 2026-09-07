import { useState } from "react";
import AgentExplorer from "./components/AgentExplorer";
import PolicyManager from "./components/PolicyManager";
import RegisterAgent from "./components/RegisterAgent";
import ActivityFeed from "./components/ActivityFeed";
import WalletConnect from "./components/WalletConnect";
import ProximaLogo from "./components/ProximaLogo";
import { useAgentCount } from "./hooks/useRegistry";
import { usePolicyCount } from "./hooks/usePolicy";

type Tab = "explore" | "register" | "policies" | "activity";

export interface PolicyPrefill {
  agentId: string;
  agentName: string;
}

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: "explore",   label: "Explorer"  },
  { id: "register",  label: "Register"  },
  { id: "policies",  label: "Policies"  },
  { id: "activity",  label: "Activity"  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [policyPrefill, setPolicyPrefill] = useState<PolicyPrefill | null>(null);

  const { count: agentCount,  loading: agentCountLoading  } = useAgentCount();
  const { count: policyCount, loading: policyCountLoading } = usePolicyCount();

  const STATS = [
    { label: "Registered Agents", value: agentCountLoading  ? "—" : agentCount.toLocaleString() },
    { label: "Active Policies",   value: policyCountLoading ? "—" : policyCount.toLocaleString() },
    { label: "USDC Transacted",   value: "$48,291" },
    { label: "Avg Reputation",    value: "87.4%"   },
  ];

  const handleCreatePolicy = (agentId: string, agentName: string) => {
    setPolicyPrefill({ agentId, agentName });
    setActiveTab("policies");
  };

  return (
    <div className="app-root">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <ProximaLogo size={32} showWordmark={true} />

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-btn${activeTab === item.id ? " nav-btn--active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="header-right">
            <span className="network-badge">
              <span className="network-dot" />
              Testnet
            </span>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          {STATS.map((stat, i) => (
            <div key={i} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <main className="main">
        {activeTab === "explore"   && <AgentExplorer onCreatePolicy={handleCreatePolicy} />}
        {activeTab === "register"  && <RegisterAgent />}
        {activeTab === "policies"  && (
          <PolicyManager
            prefill={policyPrefill}
            onPrefillConsumed={() => setPolicyPrefill(null)}
          />
        )}
        {activeTab === "activity"  && <ActivityFeed />}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d1117;
          color: #e6edf3;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        .app-root { min-height: 100vh; }

        /* ── Header ── */
        .header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(13,17,23,0.95);
          border-bottom: 1px solid #21262d;
          backdrop-filter: blur(8px);
        }
        .header-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px;
        }
        .header-right {
          display: flex; align-items: center; gap: 12px;
          flex-shrink: 0;
        }

        /* ── Nav ── */
        .nav { display: flex; gap: 2px; }
        .nav-btn {
          padding: 6px 14px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #8b949e;
          font-family: inherit; font-size: 13px; font-weight: 500;
          cursor: pointer;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .nav-btn:hover { color: #e6edf3; background: #161b22; }
        .nav-btn--active {
          color: #58a6ff;
          background: rgba(88,166,255,0.1);
          border-color: rgba(88,166,255,0.25);
        }

        /* ── Network badge ── */
        .network-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px;
          background: rgba(56,211,159,0.08);
          border: 1px solid rgba(56,211,159,0.2);
          border-radius: 20px;
          font-size: 12px; font-weight: 500; color: #3dd68c;
          white-space: nowrap;
        }
        .network-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #3dd68c;
          box-shadow: 0 0 6px #3dd68c;
          animation: pulse 2.5s ease-in-out infinite;
          flex-shrink: 0;
        }

        /* ── Stats bar ── */
        .stats-bar {
          border-bottom: 1px solid #21262d;
          background: #0d1117;
        }
        .stats-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 24px;
          display: grid; grid-template-columns: repeat(4, 1fr);
        }
        .stat-item {
          padding: 14px 20px;
          border-right: 1px solid #21262d;
        }
        .stat-item:last-child { border-right: none; }
        .stat-value {
          font-size: 20px; font-weight: 700; color: #e6edf3;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
        .stat-label {
          font-size: 11px; color: #8b949e; margin-top: 2px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* ── Main content ── */
        .main {
          max-width: 1280px; margin: 0 auto;
          padding: 32px 24px;
        }

        /* ── Page headers ── */
        .page-title {
          font-size: 22px; font-weight: 700; color: #e6edf3;
          letter-spacing: -0.02em; margin-bottom: 6px;
        }
        .page-subtitle {
          font-size: 13px; color: #8b949e; line-height: 1.5;
          margin-bottom: 24px;
        }

        /* ── Cards ── */
        .card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 20px;
          transition: border-color 0.15s;
        }
        .card:hover { border-color: #388bfd40; }
        .card--active { border-color: #388bfd40; }
        .card--inactive { opacity: 0.65; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          font-family: inherit; font-size: 13px; font-weight: 500;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.15s; white-space: nowrap;
          text-decoration: none;
        }
        .btn--primary {
          background: #238636; border-color: #2ea043;
          color: #fff;
        }
        .btn--primary:hover { background: #2ea043; }
        .btn--primary:disabled { background: #21262d; border-color: #30363d; color: #484f58; cursor: not-allowed; }
        .btn--secondary {
          background: #21262d; border-color: #30363d; color: #c9d1d9;
        }
        .btn--secondary:hover { background: #30363d; border-color: #8b949e; }
        .btn--ghost {
          background: transparent; border-color: #30363d; color: #8b949e;
        }
        .btn--ghost:hover { background: #161b22; color: #e6edf3; border-color: #8b949e; }
        .btn--danger {
          background: transparent; border-color: rgba(248,81,73,0.3); color: #f85149;
        }
        .btn--danger:hover { background: rgba(248,81,73,0.08); border-color: #f85149; }
        .btn--blue {
          background: rgba(88,166,255,0.1); border-color: rgba(88,166,255,0.3); color: #58a6ff;
        }
        .btn--blue:hover { background: rgba(88,166,255,0.18); border-color: #58a6ff; }
        .btn--blue:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-sm { padding: 5px 10px; font-size: 12px; }
        .btn-lg { padding: 10px 20px; font-size: 14px; font-weight: 600; }

        /* ── Form elements ── */
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label {
          font-size: 12px; font-weight: 500; color: #8b949e;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .form-input, .form-select, .form-textarea {
          padding: 8px 12px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #e6edf3;
          font-family: inherit; font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #388bfd;
          box-shadow: 0 0 0 3px rgba(56,139,253,0.12);
        }
        .form-input::placeholder, .form-textarea::placeholder { color: #484f58; }
        .form-select { cursor: pointer; }
        .form-textarea { resize: vertical; min-height: 80px; }
        select option { background: #161b22; }

        /* ── Badges ── */
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 12px;
          font-size: 11px; font-weight: 500;
          border: 1px solid transparent;
        }
        .badge--green  { background: rgba(56,211,159,0.1);  border-color: rgba(56,211,159,0.25);  color: #3dd68c; }
        .badge--red    { background: rgba(248,81,73,0.1);   border-color: rgba(248,81,73,0.25);   color: #f85149; }
        .badge--yellow { background: rgba(210,153,34,0.12); border-color: rgba(210,153,34,0.25);  color: #e3b341; }
        .badge--blue   { background: rgba(88,166,255,0.1);  border-color: rgba(88,166,255,0.25);  color: #58a6ff; }
        .badge--purple { background: rgba(163,113,247,0.1); border-color: rgba(163,113,247,0.25); color: #a371f7; }
        .badge--gray   { background: rgba(139,148,158,0.1); border-color: rgba(139,148,158,0.2);  color: #8b949e; }

        /* ── Tags (capability pills) ── */
        .tag {
          display: inline-block;
          padding: 2px 8px;
          background: rgba(163,113,247,0.1);
          border: 1px solid rgba(163,113,247,0.2);
          border-radius: 12px;
          font-size: 11px; color: #a371f7;
        }

        /* ── Alerts ── */
        .alert {
          padding: 10px 14px; border-radius: 6px;
          font-size: 12px; line-height: 1.5;
          border: 1px solid transparent;
        }
        .alert--warning { background: rgba(210,153,34,0.08); border-color: rgba(210,153,34,0.2); color: #e3b341; }
        .alert--info    { background: rgba(88,166,255,0.06); border-color: rgba(88,166,255,0.15); color: #58a6ff; }
        .alert--success { background: rgba(56,211,159,0.08); border-color: rgba(56,211,159,0.2);  color: #3dd68c; }
        .alert--error   { background: rgba(248,81,73,0.08);  border-color: rgba(248,81,73,0.2);   color: #f85149; }

        /* ── Dividers ── */
        .divider { height: 1px; background: #21262d; margin: 16px 0; }

        /* ── Mono text ── */
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; }

        /* ── Reputation bar ── */
        .rep-bar-track {
          flex: 1; height: 4px;
          background: #21262d; border-radius: 2px; overflow: hidden;
        }
        .rep-bar-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.4s ease;
        }

        /* ── Progress step ── */
        .step-row { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; }
        .step-dot {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; border: 1px solid;
          flex-shrink: 0;
        }
        .step-dot--done  { background: #238636; border-color: #2ea043; color: #fff; }
        .step-dot--active{ background: rgba(88,166,255,0.1); border-color: #388bfd; color: #58a6ff; }
        .step-dot--idle  { background: #161b22; border-color: #30363d; color: #484f58; }
        .step-connector  { flex: 1; height: 1px; background: #21262d; max-width: 32px; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }

        /* ── Animations ── */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fade-up { animation: fadeUp 0.25s ease; }

        /* ── Grid helpers ── */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .col-span-2 { grid-column: 1 / -1; }

        /* ── Spinner ── */
        .spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid #21262d;
          border-top-color: #58a6ff;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
