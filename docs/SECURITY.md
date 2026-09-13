# Proxima Security Model

This document describes the security properties of the Proxima smart contracts,
the assumptions they rely on, known limitations, and responsible disclosure
procedures.

It is written for developers integrating with Proxima and for anyone evaluating
the project's trust model — including grant reviewers and auditors.

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Contract Authorization Model](#2-contract-authorization-model)
3. [Spending Policy Safeguards](#3-spending-policy-safeguards)
4. [Storage and State Security](#4-storage-and-state-security)
5. [Immutability and Upgrade Policy](#5-immutability-and-upgrade-policy)
6. [Reputation Integrity](#6-reputation-integrity)
7. [Known Limitations and Accepted Risks](#7-known-limitations-and-accepted-risks)
8. [SDK Security Notes](#8-sdk-security-notes)
9. [Security Checklist](#9-security-checklist)
10. [Responsible Disclosure](#10-responsible-disclosure)

---

## 1. Threat Model

Proxima's contracts are designed to be safe in the following adversarial
scenarios:

| Threat | Mitigation |
|---|---|
| Unauthorized agent registration | `register()` requires the owner's `require_auth()` — only the owner's Stellar keypair can register under their address |
| Attacker hijacks an agent | `update_agent()` and `deactivate()` check `agent.owner.require_auth()` against the stored owner at write-time, not the caller |
| Agent overspends beyond its budget | Every `execute_payment()` enforces `max_per_tx` and `daily_limit` on-chain before the token transfer executes |
| Compromised agent key drains funds | Daily limit caps total exposure; owner can immediately revoke the policy to halt all further spending |
| Policy owner revoked but agent retries | `execute_payment()` checks `policy.is_active` before proceeding — revoked policies permanently reject all payments |
| Replay attacks | Soroban's built-in sequence number mechanism prevents transaction replays at the protocol level |
| Front-running a payment | The Soroban VM executes atomically within a ledger — limit checks and token transfers happen in the same transaction |
| Reputation gaming (fake high scores) | Bayesian weighted average means early ratings have diminishing influence as `total_calls` grows |
| Zero-amount drain | `execute_payment()` explicitly rejects `amount <= 0` with `PolicyError::InvalidAmount` |

---

## 2. Contract Authorization Model

### Registry Contract

| Function | Who can call | How enforced |
|---|---|---|
| `register()` | Anyone — but `owner` param must sign | `owner.require_auth()` on line 1 of function body |
| `get_agent()` | Anyone | Read-only, no auth required |
| `agent_exists()` | Anyone | Read-only, no auth required |
| `update_agent()` | Only the original owner | `agent.owner.require_auth()` — reads stored owner from state, not from caller |
| `update_reputation()` | Anyone | Intentionally open — see [Known Limitations §7.1](#71-open-reputation-updates) |
| `deactivate()` | Only the original owner | `agent.owner.require_auth()` — reads stored owner from state |
| `agent_count()` | Anyone | Read-only, no auth required |

**Key property:** ownership is stored on-chain at registration time. A caller
who is not the stored `agent.owner` cannot update or deactivate an agent,
regardless of what they pass as arguments. The authorization check reads from
contract state, not from function parameters.

### Policy Contract

| Function | Who can call | How enforced |
|---|---|---|
| `create_policy()` | Anyone — but `owner` param must sign | `owner.require_auth()` |
| `execute_payment()` | Only the policy's `agent` address | `policy.agent.require_auth()` — reads stored agent from state |
| `revoke_policy()` | Only the policy's `owner` | `policy.owner.require_auth()` — reads stored owner from state |
| `get_policy()` | Anyone | Read-only |
| `is_authorized()` | Anyone | Read-only |
| `remaining_allowance()` | Anyone | Read-only |
| `policy_count()` | Anyone | Read-only |

**Key property:** `execute_payment()` requires the **agent's** signature, not the
owner's. The owner does not need to be online or approve each payment.
However, the agent can only spend within the policy's `max_per_tx` and
`daily_limit` constraints — both enforced before the token transfer.

---

## 3. Spending Policy Safeguards

`execute_payment()` enforces five independent checks in order before any
funds move:

```
1. Policy must exist                       → PolicyError::PolicyNotFound
2. policy.agent.require_auth()             → caller must be the authorized agent
3. policy.is_active must be true           → PolicyError::PolicyInactive
4. amount > 0                              → PolicyError::InvalidAmount
5. amount ≤ policy.max_per_tx             → PolicyError::ExceedsPerTxLimit
6. allowed_recipient check (if set)        → PolicyError::RecipientNotAllowed
7. Daily window reset (if 17,280+ ledgers) → resets spent_today to 0
8. spent_today + amount ≤ daily_limit      → PolicyError::ExceedsDailyLimit
9. token::Client::transfer(...)            → actual token transfer
```

All checks are atomic within the transaction. A failure at any step aborts the
entire transaction — no partial state changes occur.

### Daily limit reset mechanism

The daily window uses **ledger sequence**, not wall-clock time:

```rust
const LEDGERS_PER_DAY: u32 = 17_280; // 86_400 seconds / 5 seconds per ledger
```

This is intentional. Wall-clock timestamps in smart contracts require an oracle,
introduce manipulation vectors, and vary with ledger close time. Ledger sequence
is canonical, deterministic, and requires no external input.

**Implication for users:** "24 hours" is approximate. If the network produces
ledgers faster or slower than 5s on average, the reset window shifts
proportionally. In practice this is within a few percent.

### Token transfer

Payments call `token::Client::transfer()` via Stellar's standard token interface.
The contract transfers from `env.current_contract_address()` to `recipient` —
meaning the **policy contract itself must hold the tokens** for transfers to
succeed. This is a design choice: the owner pre-funds the policy contract's
balance, and the agent draws from it within the defined limits.

---

## 4. Storage and State Security

Both contracts use `persistent` storage with a ~1 year TTL:

```rust
env.storage().persistent().extend_ttl(&key, 6_307_200, 6_307_200);
```

- **6,307,200 ledgers ≈ 1 year** at 5 seconds per ledger
- TTL is extended on every write to the key
- TTL is **not** extended on reads — a stale agent that has not been updated for
  over a year could theoretically be archived by the Soroban state expiry
  mechanism. Active agents should occasionally call `update_agent()` to refresh
  their TTL, or a keeper service can extend it.

**Instance storage** (used for `AgentCount` and `PolicyCount`) inherits the
contract instance's own TTL, which is managed by the Stellar protocol and
extended when the contract is invoked.

---

## 5. Immutability and Upgrade Policy

**Neither contract has an admin key, upgrade authority, or pause mechanism.**

Once deployed, the Registry and Policy contracts are immutable. This is a
deliberate security property:

- Agents can rely on the registry schema not changing under them
- Policy owners can rely on the spending constraints they set being enforced
  permanently
- No single entity (including Proxima contributors) can modify, pause, or drain
  the contracts

The trade-off is that bugs in the deployed contracts cannot be patched in-place.
A new version of either contract must be deployed as a new address, and users
must migrate to it voluntarily. See [Known Limitations §7.2](#72-no-upgrade-path).

**Deployed testnet addresses:**

| Contract | Address |
|---|---|
| Registry | `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R` |
| Policy   | `CCU6OJRXDPI4SRBL7ZJPUBTQY633ND2OLDQPMHDD4QBKAZ7IMJ3TUEBZ` |

---

## 6. Reputation Integrity

Reputation uses a Bayesian weighted average:

```
new_score = (old_score × total_calls + clamped_rating) / (total_calls + 1)
```

Properties:
- An agent starts at 5000 (50.00%) — neutral, not suspicious
- Ratings are clamped to `[0, 10_000]` before use — overflow-safe
- An agent with 10,000 calls cannot be meaningfully moved by a handful of
  malicious ratings
- Integer arithmetic with no floating point — deterministic across all VMs

**Limitation:** `update_reputation()` has no access control — anyone can submit
a rating for any agent. This is discussed in [§7.1](#71-open-reputation-updates).

---

## 7. Known Limitations and Accepted Risks

### 7.1 Open reputation updates

`update_reputation()` does not require authorization from the policy owner or
the agent being rated. Anyone can submit a rating for any agent.

**Why it is this way:** The intended flow is that the Spending Policy contract
calls `update_reputation()` after a successful payment. Since the contracts are
separate, enforcing a cross-contract caller check requires a more complex
auth pattern that was deferred.

**Practical impact:** The Bayesian weighting significantly limits the ability
to manipulate established agents. A new agent (0 calls) can be moved to 100% or
0% by a single call. Agents with many calls are protected.

**Planned fix:** A future version should either (a) require the policy contract's
address to be the caller, using a contract-to-contract auth pattern, or (b)
require `require_auth()` from a registered participant (policy owner or agent).

### 7.2 No upgrade path

If a bug is found in either deployed contract, there is no mechanism to fix it
in-place. A new contract must be deployed and users must migrate.

**Mitigation:** The test suite covers all state-modifying paths. A security
review is recommended before mainnet deployment.

### 7.3 Daily limit is approximate

As noted in §3, the `LEDGERS_PER_DAY` constant assumes exactly 5 seconds per
ledger. The actual reset window varies slightly with network conditions.

### 7.4 Policy contract must be pre-funded

`execute_payment()` transfers from `env.current_contract_address()`, which means
the policy contract's token balance must be non-zero. If a policy owner creates
a policy but does not transfer tokens to the contract address, all payment
attempts will fail with an insufficient balance error from the token contract.

This is not a security issue — it is a usability issue — but users should be
aware that creating a policy and funding it are two separate steps.

### 7.5 Agent ID squatting

`register()` allows anyone to register any agent ID as long as it has not been
taken. There is no namespace ownership or verified identity system. A malicious
actor could pre-register common IDs (e.g. `gpt-4`, `claude-3`) before legitimate
agents do.

**Mitigation:** Agent IDs are not globally meaningful outside the Proxima
registry. The `owner` address stored on-chain is the authoritative identity.
Consumers should verify `agent.owner` matches a known address rather than
relying on the agent ID string alone.

---

## 8. SDK Security Notes

### Transaction signing

The TypeScript SDK never holds private keys in memory beyond the scope of a
single call. For server-side use, keypairs are passed directly to transaction
methods. For browser use, the Freighter wallet extension handles all signing —
the SDK builds an unsigned XDR, passes it to Freighter, and submits the signed
result. The raw private key is never accessible to the SDK or the dashboard.

### Input validation

The SDK validates amounts before building transactions:

```ts
// toStroops() rejects non-numeric strings at the BigInt parsing stage
toStroops('abc') // throws — BigInt('') fails
```

Contract-level validation provides a second layer: negative amounts, zero
amounts, and amounts exceeding policy limits all panic with typed error codes
before any state changes occur.

### Error handling

All SDK errors are instances of `ProximaError` with a typed `code` field.
Applications should catch `ProximaError` and handle `ErrorCodes.EXCEEDS_DAILY_LIMIT`
and `ErrorCodes.POLICY_INACTIVE` explicitly rather than letting them propagate
as unhandled exceptions.

### RPC endpoint trust

The SDK connects to public Stellar RPC endpoints by default. For production
applications, consider using a private or dedicated RPC node to reduce
exposure to man-in-the-middle risks on the RPC layer.

---

## 9. Security Checklist

This checklist summarises the verifiable security properties of the current
contracts. Each item links to the relevant code location.

| Property | Status | Location |
|---|---|---|
| `register()` requires caller authorization | ✅ | `registry.rs:75` — `owner.require_auth()` |
| `update_agent()` checks stored owner, not caller | ✅ | `registry.rs:152` — `agent.owner.require_auth()` |
| `deactivate()` checks stored owner | ✅ | `registry.rs:192` — `agent.owner.require_auth()` |
| `create_policy()` requires caller authorization | ✅ | `policy.rs:81` — `owner.require_auth()` |
| `execute_payment()` requires agent signature | ✅ | `policy.rs:131` — `policy.agent.require_auth()` |
| `revoke_policy()` requires owner signature | ✅ | `policy.rs:183` — `policy.owner.require_auth()` |
| Zero and negative payment amounts rejected | ✅ | `policy.rs:137` — `amount <= 0` check |
| Per-transaction limit enforced before transfer | ✅ | `policy.rs:143` — `ExceedsPerTxLimit` check |
| Daily limit enforced before transfer | ✅ | `policy.rs:158` — `ExceedsDailyLimit` check |
| Revoked policies permanently reject payments | ✅ | `policy.rs:134` — `is_active` check |
| Token transfer is last operation (checks-effects-interactions) | ✅ | `policy.rs:163` — transfer after all checks |
| No admin key or upgrade authority | ✅ | Neither contract has an `initialize()` or `upgrade()` function |
| Integer overflow protection | ✅ | Cargo.toml: `overflow-checks = true` in release profile |
| Reputation rating clamped to valid range | ✅ | `registry.rs:175` — `rating.min(10000)` |
| Daily window uses ledger sequence (no oracle) | ✅ | `policy.rs:148` — `LEDGERS_PER_DAY` constant |
| `update_reputation()` has no access control | ⚠️ | See [§7.1](#71-open-reputation-updates) |
| Policy contract requires pre-funding | ⚠️ | See [§7.4](#74-policy-contract-must-be-pre-funded) |
| No agent ID namespace ownership | ⚠️ | See [§7.5](#75-agent-id-squatting) |
| Formal audit completed | ❌ | Planned before mainnet deployment |

---

## 10. Responsible Disclosure

Proxima is currently deployed on **Stellar testnet only**. There are no real
funds at risk.

If you discover a security issue — particularly one that would affect a mainnet
deployment — please report it privately before disclosing publicly:

**Email:** open an issue marked `[SECURITY]` on the GitHub repository with a
brief description only, and request a private channel. Do not include exploit
details in the public issue.

**GitHub:** [github.com/IyanuOluwaJesuloba/Proxima/issues](https://github.com/IyanuOluwaJesuloba/Proxima/issues)

We will respond within 48 hours and work with you on a coordinated disclosure
timeline.

Once Proxima is deployed to mainnet, it will be eligible for the
[Stellar Bug Bounty Program](https://stellar.org/grants-and-funding/bug-bounty),
which covers Soroban smart contracts for awards up to $50,000.

---

*Last updated: September 2026. Reflects contracts at commit `4cffc79`.*
