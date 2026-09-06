# Proxima — Grant Application

> Use this document as the basis for applications to GrantFox, Stellar Wave / Drips, and SCF Build Awards.

---

## Project Name
**Proxima — AI Agent Registry & Autonomous Payment Gateway**

---

## One-Line Description
An open-source, on-chain infrastructure layer that enables AI agents to be discovered, verified, and pay each other autonomously on Stellar — without per-transaction human approval.

---

## Problem Statement

The AI agent economy is accelerating. Agents increasingly need to call other agents: an orchestrator agent calls a search agent, which calls a summarization agent, which calls an image agent. Every hop costs money. Every payment currently requires a human to sign.

This creates two critical bottlenecks on Stellar today:

**1. No open agent discovery layer.**
Every platform that hosts AI agents (OpenAI, Anthropic, etc.) is a walled garden. There is no open, portable, on-chain registry where a Stellar developer can publish an agent, set a price, build a reputation, and be discovered by any other agent or application in the ecosystem. This means every project rebuilds the same discovery logic from scratch.

**2. No programmable autonomous payment layer.**
Stellar's x402 payment protocol enables agents to respond to payment challenges. But the protocol requires that each payment be authorized by a human signer. This fundamentally breaks autonomous agent workflows where an orchestrator might make hundreds of micro-payments per hour. There is no existing open-source solution on Stellar for delegated, policy-bounded autonomous spending.

**Proxima solves both problems with production-grade open-source infrastructure.**

---

## Solution

Proxima delivers three interconnected components:

### 1. Agent Registry (Soroban Smart Contract)
A permissionless on-chain registry where AI agents are published with verifiable metadata: capabilities, pricing, reputation score, and owner wallet. Fully queryable by any Stellar developer.

Key design choices:
- **Reputation is Bayesian** — weighted by call history, resistant to gaming
- **Persistent storage with extended TTL** — data survives Soroban archival
- **No admin keys** — immutable, trustless infrastructure
- **Event-emitting** — every state change is indexed for downstream tooling

### 2. Spending Policy Contract (Soroban Smart Contract)
A programmable authorization contract that gives an agent a bounded budget to spend autonomously — without requiring per-transaction human approval.

```
Owner sets: max $0.50/tx, $10/day → Agent pays freely within those bounds
```

Key design choices:
- **Dual limits** — per-transaction cap + daily cap prevents runaway spending
- **Instant revocation** — owner can cut off agent at any time on-chain
- **x402 compatible** — fits directly into the Stellar x402 payment flow
- **Ledger-based daily reset** — deterministic, no oracle dependency

### 3. TypeScript SDK + React Dashboard
A developer-friendly SDK that makes the above contracts accessible in any JS/TS project. Plus a full React explorer for browsing agents, managing policies, and monitoring live activity.

---

## Why This Belongs on Stellar

This is not a project where Stellar is an afterthought. Stellar is the *only* viable chain for this:

- **Sub-cent fees** make per-call micropayments economically meaningful
- **5-second finality** makes real-time agent-to-agent payments practical
- **USDC as a native asset** eliminates bridging risk and complexity
- **Soroban** provides the programmable policy enforcement layer
- **x402** is Stellar's own standard for agentic payment flows — Proxima extends it

No other chain combines all four of these properties.

---

## Open Source Commitment

Proxima is and will remain fully open source under the MIT license:

- All Soroban contracts are publicly auditable
- The SDK is published to npm as `@Proxima/sdk`
- The dashboard is deployable by anyone
- All issues are publicly labeled for community contribution
- Contributor guidelines are thorough and welcoming to new Stellar developers

---

## Roadmap & Milestones

| Milestone | Deliverable | Timeline |
|---|---|---|
| M1 | Registry + Policy contracts deployed to Testnet, full test suite | Month 2 |
| M2 | SDK v0.1 published to npm, 2 working examples | Month 3 |
| M3 | Dashboard live, Freighter integration, Activity Feed | Month 4 |
| M4 | x402 integration demo, Mainnet deployment | Month 5 |
| M5 | Documentation site, security review, launch post | Month 5 |

---

## Contributor Opportunities

Proxima has been designed from the ground up for community contribution. Labeled GitHub issues cover:

- 🔵 Soroban: add batch registration, add contract upgrade path, add on-chain agent reviews
- 🟣 SDK: implement find() with indexer, add event subscription, add React hooks package
- 🟠 Dashboard: add wallet connect flow, add reputation history chart, add agent comparison view
- 📖 Docs: write SDK quickstart guide, write x402 integration tutorial
- 🟢 Good First Issues: add missing TypeScript types, improve error messages, add loading states to dashboard

Every issue is scoped with acceptance criteria, relevant files listed, and estimated effort. This makes Proxima an excellent project for Stellar Wave contributors to pick up issues and earn rewards.

---

## Team

Proxima is a community project. The initial architecture and codebase was developed by contributors passionate about making Stellar the home of the AI agent economy. We are actively seeking co-maintainers with experience in Rust/Soroban, TypeScript, and React.

---

## Links

- **GitHub:** https://github.com/IyanuOluwJesuloba/Proxima
- **License:** MIT
- **Contact:** jesulobaowoseni1@gmail.com
