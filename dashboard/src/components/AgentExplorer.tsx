import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  priceDisplay: string;
  reputationDisplay: string;
  reputation: number;
  totalCalls: number;
  isActive: boolean;
  owner: string;
  registeredAt: string;
}

// Mock data — in production this comes from on-chain + indexer
const MOCK_AGENTS: Agent[] = [
  {
    id: "gpt-inference-v2",
    name: "GPT Inference Relay",
    description: "High-throughput text generation and completion via OpenAI-compatible API. Supports streaming responses.",
    capabilities: ["text-generation", "completion", "summarization"],
    priceDisplay: "0.0100000 USDC",
    reputationDisplay: "94.20%",
    reputation: 9420,
    totalCalls: 48291,
    isActive: true,
    owner: "GDXK...A3MN",
    registeredAt: "2026-04-12",
  },
  {
    id: "flux-image-gen-v1",
    name: "Flux Image Generator",
    description: "State-of-the-art image generation. Supports 1:1, 16:9, and portrait formats. 3–5s generation time.",
    capabilities: ["image-generation", "text-to-image"],
    priceDisplay: "0.0500000 USDC",
    reputationDisplay: "91.75%",
    reputation: 9175,
    totalCalls: 12840,
    isActive: true,
    owner: "GBKR...2XPL",
    registeredAt: "2026-03-28",
  },
  {
    id: "web-search-agent-v3",
    name: "Web Search Agent",
    description: "Real-time web search with structured JSON output. Returns top 10 results with snippets and metadata.",
    capabilities: ["web-search", "data-retrieval"],
    priceDisplay: "0.0050000 USDC",
    reputationDisplay: "88.40%",
    reputation: 8840,
    totalCalls: 93102,
    isActive: true,
    owner: "GCTP...7QMN",
    registeredAt: "2026-02-15",
  },
  {
    id: "whisper-transcription-v1",
    name: "Whisper Transcription",
    description: "Audio-to-text transcription using Whisper Large v3. Supports 50+ languages, returns timestamped output.",
    capabilities: ["speech-to-text", "transcription", "translation"],
    priceDisplay: "0.0200000 USDC",
    reputationDisplay: "96.10%",
    reputation: 9610,
    totalCalls: 7421,
    isActive: true,
    owner: "GAMT...5PQR",
    registeredAt: "2026-05-01",
  },
  {
    id: "code-executor-sandbox-v2",
    name: "Code Executor Sandbox",
    description: "Secure sandboxed Python/JS code execution. Returns stdout, stderr, and exit codes. 30s timeout.",
    capabilities: ["code-execution", "python", "javascript"],
    priceDisplay: "0.0150000 USDC",
    reputationDisplay: "79.30%",
    reputation: 7930,
    totalCalls: 5209,
    isActive: true,
    owner: "GBMC...1ZXA",
    registeredAt: "2026-04-20",
  },
  {
    id: "data-enrichment-v1",
    name: "Data Enrichment Agent",
    description: "Enrich company/person data from multiple public sources. Returns structured JSON with confidence scores.",
    capabilities: ["data-enrichment", "research", "structured-output"],
    priceDisplay: "0.0300000 USDC",
    reputationDisplay: "85.60%",
    reputation: 8560,
    totalCalls: 3814,
    isActive: false,
    owner: "GDBR...9YKL",
    registeredAt: "2026-03-10",
  },
];

const ALL_CAPABILITIES = Array.from(
  new Set(MOCK_AGENTS.flatMap((a) => a.capabilities))
).sort();

function ReputationBar({ score }: { score: number }) {
  const pct = score / 100;
  const color = pct >= 90 ? "#00ff78" : pct >= 75 ? "#00c8ff" : pct >= 60 ? "#ffb830" : "#ff4060";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1, height: "3px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          borderRadius: "2px",
          transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: "11px", color, fontWeight: "600", minWidth: "44px" }}>
        {(score / 100).toFixed(2)}%
      </span>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${agent.isActive ? "rgba(0,200,255,0.15)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "10px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s",
        animation: "fadeIn 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(0,200,255,0.05)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,200,255,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLDivElement).style.borderColor = agent.isActive
          ? "rgba(0,200,255,0.15)"
          : "rgba(255,255,255,0.06)";
      }}
    >
      {/* Status stripe */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "3px", height: "100%",
        background: agent.isActive
          ? "linear-gradient(180deg, #00c8ff, #7830ff)"
          : "rgba(255,255,255,0.1)",
      }} />

      <div style={{ paddingLeft: "8px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                {agent.name}
              </span>
              {!agent.isActive && (
                <span style={{
                  fontSize: "9px", padding: "2px 6px",
                  background: "rgba(255,100,60,0.15)",
                  border: "1px solid rgba(255,100,60,0.3)",
                  borderRadius: "4px", color: "#ff6440",
                  letterSpacing: "0.1em",
                }}>INACTIVE</span>
              )}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(0,200,255,0.5)", marginTop: "2px", letterSpacing: "0.05em" }}>
              {agent.id}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#00ff78" }}>
              {agent.priceDisplay}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)", marginTop: "2px" }}>
              per call
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: "12px", color: "rgba(226,232,240,0.55)",
          marginTop: "10px", lineHeight: "1.6",
        }}>
          {agent.description}
        </p>

        {/* Capabilities */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
          {agent.capabilities.map((cap) => (
            <span key={cap} style={{
              fontSize: "10px", padding: "3px 8px",
              background: "rgba(120,48,255,0.15)",
              border: "1px solid rgba(120,48,255,0.25)",
              borderRadius: "4px", color: "rgba(180,140,255,0.9)",
              letterSpacing: "0.05em",
            }}>
              {cap}
            </span>
          ))}
        </div>

        {/* Reputation bar */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.3)", marginBottom: "4px", letterSpacing: "0.1em" }}>
            REPUTATION
          </div>
          <ReputationBar score={agent.reputation} />
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{
            marginTop: "16px",
            padding: "14px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
            animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {[
                { label: "TOTAL CALLS", value: agent.totalCalls.toLocaleString() },
                { label: "REGISTERED", value: agent.registeredAt },
                { label: "OWNER", value: agent.owner },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "9px", color: "rgba(226,232,240,0.3)", letterSpacing: "0.12em" }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>{value}</div>
                </div>
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); }}
              style={{
                marginTop: "14px",
                padding: "8px 16px",
                background: "linear-gradient(135deg, rgba(0,200,255,0.15), rgba(120,48,255,0.15))",
                border: "1px solid rgba(0,200,255,0.3)",
                borderRadius: "6px",
                color: "#00c8ff",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "inherit",
                letterSpacing: "0.08em",
              }}
            >
              CREATE SPENDING POLICY →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentExplorer() {
  const [search, setSearch] = useState("");
  const [filterCap, setFilterCap] = useState("");
  const [filterActive, setFilterActive] = useState(false);
  const [sortBy, setSortBy] = useState<"reputation" | "calls" | "price">("reputation");

  const filtered = MOCK_AGENTS
    .filter((a) => {
      if (filterActive && !a.isActive) return false;
      if (filterCap && !a.capabilities.includes(filterCap)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.capabilities.some((c) => c.includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "reputation") return b.reputation - a.reputation;
      if (sortBy === "calls") return b.totalCalls - a.totalCalls;
      if (sortBy === "price") return parseFloat(a.priceDisplay) - parseFloat(b.priceDisplay);
      return 0;
    });

  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", letterSpacing: "-0.02em" }}>
          Agent Explorer
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
          Browse and discover AI agents registered on the Proxima registry.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "24px",
        flexWrap: "wrap",
      }}>
        <input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: "200px",
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

        <select
          value={filterCap}
          onChange={(e) => setFilterCap(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: filterCap ? "#00c8ff" : "rgba(226,232,240,0.4)",
            fontSize: "12px",
            fontFamily: "inherit",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">All Capabilities</option>
          {ALL_CAPABILITIES.map((cap) => (
            <option key={cap} value={cap} style={{ background: "#0a1520" }}>{cap}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "rgba(226,232,240,0.6)",
            fontSize: "12px",
            fontFamily: "inherit",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="reputation" style={{ background: "#0a1520" }}>Sort: Reputation</option>
          <option value="calls" style={{ background: "#0a1520" }}>Sort: Most Used</option>
          <option value="price" style={{ background: "#0a1520" }}>Sort: Cheapest</option>
        </select>

        <button
          onClick={() => setFilterActive(!filterActive)}
          style={{
            padding: "10px 16px",
            background: filterActive ? "rgba(0,255,120,0.1)" : "rgba(255,255,255,0.04)",
            border: filterActive ? "1px solid rgba(0,255,120,0.3)" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: filterActive ? "#00ff78" : "rgba(226,232,240,0.4)",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "inherit",
            letterSpacing: "0.05em",
          }}
        >
          {filterActive ? "● ACTIVE ONLY" : "○ ACTIVE ONLY"}
        </button>
      </div>

      {/* Result count */}
      <div style={{
        fontSize: "11px", color: "rgba(226,232,240,0.3)",
        marginBottom: "16px", letterSpacing: "0.1em",
      }}>
        SHOWING {filtered.length} OF {MOCK_AGENTS.length} AGENTS
      </div>

      {/* Agent grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
        gap: "12px",
      }}>
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          color: "rgba(226,232,240,0.2)", fontSize: "14px",
        }}>
          No agents match your filters.
        </div>
      )}
    </div>
  );
}
