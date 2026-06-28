# StellarMind 🧠⚡

**Open-source AI Agent Registry & Autonomous Payment Gateway on Stellar**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blue)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-purple)](https://soroban.stellar.org)
[![TypeScript](https://img.shields.io/badge/SDK-TypeScript-blue)](https://www.typescriptlang.org/)

---

## The Problem

The AI agent economy is arriving — and Stellar is the natural home for it. With sub-5-second finality, near-zero fees, and USDC as a native first-class asset, Stellar is technically perfect for autonomous agent-to-agent payments.

But two critical pieces of infrastructure are missing:

1. **There is no open, on-chain registry** where AI agents can be discovered, verified, and evaluated on Stellar. Every platform that hosts agents is a walled garden. There is no portable, trustless reputation.

2. **There is no programmable spending-policy layer** that allows agents to pay other agents *autonomously* within defined budgets — without requiring a human to sign every transaction. This is the #1 unsolved problem blocking real-world agentic commerce on x402 and every similar protocol.

StellarMind solves both.

---

## What StellarMind Is

StellarMind is a **3-layer open-source infrastructure project** built natively on Stellar:

```
┌─────────────────────────────────────────────────────────┐
│                   STELLARMIND STACK                      │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Dashboard UI       React explorer & mgmt app  │
│  Layer 2: TypeScript SDK     Drop-in developer toolkit  │
│  Layer 1: Soroban Contracts  On-chain registry + policy │
└─────────────────────────────────────────────────────────┘
```

### Layer 1 — Agent Registry Contract (`/contracts`)
A Soroban smart contract that stores a **verifiable, on-chain registry of AI agents**:
- Agent metadata: name, description, capabilities, pricing, owner wallet
- Reputation scores updated after every completed interaction
- Query by capability, price range, or reputation threshold
- Fully permissionless — any developer can register an agent

### Layer 2 — Spending Policy Contract (`/contracts`)
A **programmable authorization contract** that enables agents to pay autonomously:
- Owner defines a spending budget (e.g. 10 USDC/day max)
- Agent executes payments within the policy without per-transaction human approval
- Policy is enforced on-chain — no trust required
- Directly solves the delegation gap blocking x402 autonomous flows

### Layer 3 — TypeScript SDK (`/sdk`)
A clean, well-documented SDK developers drop into any JS/TS project:
```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'mainnet' })

// Register an agent
await mind.registry.register({ name: 'DataFetcher', capabilities: ['web-search'], pricePerCall: '0.01' })

// Find agents by capability
const agents = await mind.registry.find({ capability: 'image-generation', maxPrice: '0.05' })

// Create a spending policy
const policy = await mind.policy.create({ agent: agentAddress, dailyLimit: '10', asset: 'USDC' })

// Agent pays autonomously
await mind.policy.pay({ policyId, recipient, amount: '0.01', memo: 'API call #4821' })
```

For complete setup, registration, policy, payment, and error-handling examples,
see [docs/SDK_GUIDE.md](./docs/SDK_GUIDE.md).

### Layer 4 — Explorer Dashboard (`/dashboard`)
A beautiful React web app for:
- Browsing and searching registered agents
- Viewing agent reputation and transaction history
- Creating and managing spending policies
- Real-time activity feed from Stellar network

---

## Why Stellar

StellarMind is built **exclusively and deeply** on Stellar — not shoehorned in:

| Stellar Feature | How StellarMind Uses It |
|---|---|
| Soroban smart contracts | Registry + spending policy contracts (Rust/WASM) |
| USDC as native asset | All agent payments settle in USDC, no bridging |
| Sub-5s finality | Real-time agent-to-agent micropayments |
| ~0.00001 XLM fees | Sub-cent payments are economically viable |
| x402 compatibility | Spending policy integrates with x402 payment flows |
| Stellar RPC | SDK queries on-chain registry state in real time |
| Horizon API | Dashboard pulls live transaction and account data |

---

## Architecture

```
                     ┌──────────────┐
                     │   AI Agent   │
                     └──────┬───────┘
                            │ calls SDK
                     ┌──────▼───────┐
                     │  StellarMind │
                     │     SDK      │
                     └──────┬───────┘
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────▼──┐  ┌───────▼────┐  ┌────▼──────────┐
    │  Registry  │  │  Spending  │  │  Stellar RPC  │
    │  Contract  │  │   Policy   │  │  / Horizon    │
    │ (Soroban)  │  │ (Soroban)  │  │     API       │
    └────────────┘  └────────────┘  └───────────────┘
              │             │
              └──────┬──────┘
                     │
              ┌──────▼───────┐
              │   Stellar    │
              │   Network    │
              │  (Mainnet)   │
              └──────────────┘
```

---

## Project Structure

```
stellarmind/
├── contracts/                    # Soroban smart contracts (Rust)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── registry.rs           # Agent Registry contract
│   │   ├── policy.rs             # Spending Policy contract
│   │   ├── types.rs              # Shared types
│   │   └── lib.rs
│   └── tests/
│       ├── registry_test.rs
│       └── policy_test.rs
│
├── sdk/                          # TypeScript SDK
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # Main export
│   │   ├── registry.ts           # Registry client
│   │   ├── policy.ts             # Policy client
│   │   ├── stellar.ts            # Stellar connection helpers
│   │   └── types.ts              # TypeScript types
│   └── examples/
│       ├── register-agent.ts
│       └── autonomous-payment.ts
│
├── dashboard/                    # React explorer app
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentExplorer.tsx
│   │   │   ├── PolicyManager.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── RegisterAgent.tsx
│   │   ├── hooks/
│   │   │   ├── useRegistry.ts
│   │   │   └── usePolicy.ts
│   │   └── lib/
│   │       └── stellarmind.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRACT_SPEC.md
│   ├── SDK_GUIDE.md
│   └── DEPLOYMENT.md
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── good-first-issue.md
│   └── workflows/
│       ├── test-contracts.yml
│       └── test-sdk.yml
│
├── CONTRIBUTING.md
├── LICENSE
└── README.md                     ← you are here
```

---

## Roadmap

### Phase 1 — Foundation (Months 1–2)
- [x] Project scaffold & architecture
- [ ] Agent Registry Soroban contract (Rust) + tests
- [ ] Spending Policy Soroban contract (Rust) + tests
- [ ] Deploy both contracts to Stellar Testnet
- [ ] TypeScript SDK core (registry + policy clients)
- [ ] SDK unit tests

### Phase 2 — Explorer (Months 3–4)
- [ ] React dashboard — Agent Explorer UI
- [ ] React dashboard — Policy Manager UI
- [ ] Real-time Activity Feed (Stellar event streaming)
- [ ] Freighter wallet integration
- [ ] SDK usage examples (2 complete examples)

### Phase 3 — Integration & Polish (Month 5)
- [ ] x402 payment flow integration demo
- [ ] Mainnet deployment
- [ ] Full documentation site
- [ ] Security review
- [ ] Video demo + launch post

---

## Contributing

StellarMind is built for the community, by the community. We have labeled issues for every skill level:

- 🟢 `good-first-issue` — great for first-time Stellar contributors
- 🟡 `help-wanted` — well-scoped features needing an owner
- 🔵 `soroban` — Rust/Soroban contract work
- 🟣 `sdk` — TypeScript SDK work
- 🟠 `dashboard` — React UI work

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full contributor guide.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust, Soroban SDK, WebAssembly |
| SDK | TypeScript, stellar-sdk, Stellar RPC |
| Dashboard | React, TypeScript, Tailwind CSS |
| Wallet | Freighter (Stellar wallet) |
| Network | Stellar Mainnet / Testnet |
| Payments | USDC (Circle), x402 compatible |

---

## License

MIT License — see [LICENSE](./LICENSE)

---

## Links

- 🌐 **Live App:** coming soon
- 📖 **Docs:** `/docs`
- 💬 **Discord:** coming soon
- 🐦 **Twitter:** coming soon

---

*StellarMind is a community project. It is not affiliated with or endorsed by the Stellar Development Foundation.*
