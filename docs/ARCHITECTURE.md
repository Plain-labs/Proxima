# Proxima Architecture

## Overview

Proxima is structured as a three-layer system where each layer has a clear responsibility and clean interfaces to the others.

```
┌────────────────────────────────────────────────────────────────┐
│                      CONSUMER LAYER                            │
│   AI Agents · DApps · Automation Scripts · Partner Services   │
└────────────────────────────┬───────────────────────────────────┘
                             │ TypeScript SDK
┌────────────────────────────▼───────────────────────────────────┐
│                      SDK LAYER                                 │
│            @Proxima/sdk (TypeScript / Node.js)             │
│     RegistryClient          PolicyClient          Utils        │
└──────────────┬──────────────────────────┬─────────────────────┘
               │ Stellar RPC              │ Stellar RPC
┌──────────────▼──────────┐  ┌────────────▼───────────────────── ┐
│  REGISTRY CONTRACT      │  │  SPENDING POLICY CONTRACT          │
│  (Soroban / Rust)       │  │  (Soroban / Rust)                  │
│                         │  │                                    │
│  store: Agent{}         │  │  store: SpendingPolicy{}           │
│  fn register()          │  │  fn create_policy()                │
│  fn get_agent()         │  │  fn execute_payment()              │
│  fn update_reputation() │  │  fn revoke_policy()                │
│  fn deactivate()        │  │  fn remaining_allowance()          │
└──────────────┬──────────┘  └────────────┬──────────────────────┘
               │                          │
┌──────────────▼──────────────────────────▼──────────────────────┐
│                      STELLAR NETWORK                           │
│            Soroban VM · USDC Token Contract · Horizon API      │
└────────────────────────────────────────────────────────────────┘
```

---

## Contract Design Decisions

### Why Two Contracts?

The Registry and SpendingPolicy are **separate contracts** by design:

1. **Separation of concerns** — The registry is a global public good. Any developer can read from it without needing to interact with payment logic. Merging them would couple unrelated state.

2. **Upgrade independence** — The registry schema can evolve (adding fields to `Agent`) without touching payment logic, and vice versa.

3. **Access control** — Registry reads are fully public. Policy execution requires agent authorization. Keeping them separate makes the security boundary explicit and auditable.

### Storage Strategy

Both contracts use `persistent` storage with extended TTL (approximately 1 year):

```rust
env.storage().persistent().set(&key, &value);
env.storage().persistent().extend_ttl(&key, 6_307_200, 6_307_200);
```

This ensures on-chain data survives Soroban's state archival without requiring constant owner intervention. The TTL is extended on every write operation automatically.

### Reputation Algorithm

Reputation uses a **Bayesian weighted average** to prevent gaming:

```
new_score = (old_score × total_calls + new_rating) / (total_calls + 1)
```

- A brand new agent starts at 50.00% (5000/10000)
- Each new rating is weighted by total call history
- An agent with 10,000 calls cannot be easily manipulated by a few bad ratings
- Scores are stored as integers (0–10000) to avoid floating-point issues in WASM

### Daily Limit Reset Mechanism

The spending policy uses **ledger sequence** rather than timestamps for daily resets:

```rust
const LEDGERS_PER_DAY: u32 = 17_280; // 86400s / 5s per ledger
```

This is deterministic and manipulation-resistant. Wall-clock time in smart contracts introduces oracle dependencies and manipulation vectors. Ledger sequence is canonical and requires no external input.

---

## SDK Design Decisions

### Simulation for Read Calls

All read operations (getAgent, getPolicy, agentExists) use `simulateTransaction` rather than actual submissions. This means:
- Zero cost (no fees)
- Instant results (no confirmation wait)
- No keypair required for reads

Only write operations (register, createPolicy, executePayment) require a keypair and actual transaction submission.

### Error Hierarchy

The SDK uses a typed `ProximaError` class with a `code` string field rather than raw Error objects:

```ts
try {
  await mind.registry.getAgent('unknown-id')
} catch (err) {
  if (err instanceof ProximaError && err.code === ErrorCodes.AGENT_NOT_FOUND) {
    // handle gracefully
  }
}
```

This makes error handling in consuming applications explicit and type-safe.

---

## Event Indexing

The contracts emit structured events for every state change:

| Event | Emitted By | Payload |
|---|---|---|
| `register/agent` | Registry | agent_id |
| `update/agent` | Registry | agent_id |
| `deact/agent` | Registry | agent_id |
| `repupd/agent` | Registry | (agent_id, new_score) |
| `policy/create` | Policy | policy_id |
| `policy/revoke` | Policy | policy_id |
| `pay/exec` | Policy | (policy_id, amount) |

These events are designed to be indexed by services like **Mercury** or a custom Stellar event stream listener to power:
- The Dashboard Activity Feed
- The Registry search/filter (find by capability)
- Analytics and reporting

---

## x402 Integration

Proxima's SpendingPolicy is designed to be x402-compatible. In an x402 flow:

1. Agent receives a `402 Payment Required` response from a resource server
2. Agent reads the price from the `X-Payment` header
3. Agent calls `policy.execute_payment()` with the policy ID and required amount
4. Stellar settles in < 5 seconds
5. Agent retries the request with proof of payment

The spending policy enforces that no single payment exceeds `max_per_tx` and the daily total stays within `daily_limit` — making fully autonomous x402 flows safe and bounded without per-transaction human approval.

---

## Security Considerations

1. **Agent authorization** — `execute_payment` requires `agent.require_auth()`. The agent's Stellar keypair must sign the transaction. The policy owner does not need to be present.

2. **No unlimited delegation** — All policies have both a per-transaction cap and a daily cap. There is no "unlimited" policy mode.

3. **Revocability** — The owner can revoke any policy at any time, immediately halting further spending. This is an on-chain operation with immediate effect.

4. **No admin keys** — Neither contract has an admin or upgrade key. Once deployed, the contracts are immutable. This is intentional: infrastructure that agents depend on must be trustless.

5. **Recipient restriction** — Policies can optionally restrict spending to a single recipient address, for use cases where the agent should only pay a known service.
