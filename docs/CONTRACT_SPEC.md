# Proxima Contract Specification

This document is the authoritative reference for both Soroban contracts:
the **Agent Registry** and the **Spending Policy**.

---

## Registry Contract

**Contract ID (Testnet):** `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R`

### Storage

| Key | Type | TTL | Description |
|---|---|---|---|
| `Agent(id)` | `Agent` | persistent, ~1 year | Full agent record keyed by string ID |
| `AgentCount` | `u64` | instance | Running total of registered agents |

### Functions

#### `register`

Registers a new AI agent. Panics if the ID already exists.

```
register(
  id: String,
  name: String,
  description: String,
  capabilities: Vec<String>,
  price_per_call: i128,
  payment_asset: String,
  payment_issuer: Address,
  endpoint_url: Bytes,
) -> String
```

| Arg | Validation |
|---|---|
| `price_per_call` | Must be ≥ 0. Negative values panic with `InvalidPrice` |
| `capabilities` | Must be non-empty. Empty vec panics with `EmptyCapabilities` |
| `id` | Must be unique. Duplicate panics with `AgentAlreadyExists` |

Emits: `(symbol("regist"), symbol("agent"), agent_id)`

---

#### `get_agent`

Returns the full `Agent` struct for a given ID. Panics with `AgentNotFound` if missing.

```
get_agent(id: String) -> Agent
```

---

#### `agent_exists`

Returns `true` if the agent ID is registered, `false` otherwise. Never panics.

```
agent_exists(id: String) -> bool
```

---

#### `update_agent`

Updates metadata on an existing agent. Only the owner can call this.

```
update_agent(
  id: String,
  name: String,
  description: String,
  capabilities: Vec<String>,
  price_per_call: i128,
  is_active: bool,
  endpoint_url: Bytes,
)
```

Requires `agent.owner.require_auth()`. Emits: `(symbol("update"), symbol("agent"), agent_id)`

---

#### `update_reputation`

Updates the agent's reputation score using a Bayesian weighted average.
Intended to be called after each completed interaction.

```
update_reputation(id: String, rating: u32)
```

- `rating` is clamped to `[0, 10000]`
- Formula: `new_score = (old_score × total_calls + rating) / (total_calls + 1)`
- `total_calls` is incremented on every call

Emits: `(symbol("repupd"), symbol("agent"), (agent_id, new_score))`

---

#### `deactivate`

Marks an agent as inactive. Only the owner can call this.

```
deactivate(id: String)
```

Emits: `(symbol("deact"), symbol("agent"), agent_id)`

---

#### `agent_count`

Returns total number of agents ever registered (including inactive ones).

```
agent_count() -> u64
```

---

### Error Codes

| Code | Value | Meaning |
|---|---|---|
| `AgentNotFound` | 1 | No agent with that ID exists |
| `AgentAlreadyExists` | 2 | An agent with that ID is already registered |
| `NotOwner` | 3 | Caller is not the agent owner |
| `InvalidPrice` | 4 | `price_per_call` is negative |
| `EmptyCapabilities` | 5 | `capabilities` vec is empty |
| `Unauthorized` | 6 | General authorization failure |

---

### Agent Struct

```rust
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub price_per_call: i128,    // in stroops
    pub payment_asset: String,
    pub payment_issuer: Address,
    pub owner: Address,
    pub reputation: u32,         // 0–10000 (0.00%–100.00%)
    pub total_calls: u64,
    pub is_active: bool,
    pub registered_at: u32,      // ledger sequence
    pub endpoint_url: Bytes,
}
```

---

## Spending Policy Contract

**Contract ID (Testnet):** `CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ`

### Storage

| Key | Type | TTL | Description |
|---|---|---|---|
| `Policy(id)` | `SpendingPolicy` | persistent, ~1 year | Full policy record keyed by u64 ID |
| `PolicyCount` | `u64` | instance | Running total of created policies |

### Functions

#### `create_policy`

Creates a new spending policy that authorises an agent to pay autonomously.

```
create_policy(
  agent: Address,
  max_per_tx: i128,
  daily_limit: i128,
  asset: String,
  issuer: Address,
  allowed_recipient: Option<Address>,
) -> u64
```

Returns the new policy ID (auto-incremented). Both `max_per_tx` and `daily_limit`
must be > 0 or the call panics with `InvalidAmount`.

Emits: `(symbol("policy"), symbol("create"), policy_id)`

---

#### `execute_payment`

Executes an autonomous payment under a policy. **The agent signs this
transaction — the owner does not need to be present.**

```
execute_payment(
  policy_id: u64,
  recipient: Address,
  amount: i128,
  memo: String,
) -> PaymentRecord
```

Checks performed (in order):
1. Policy must exist → `PolicyNotFound`
2. `policy.agent.require_auth()` — agent must sign
3. Policy must be active → `PolicyInactive`
4. `amount > 0` → `InvalidAmount`
5. `amount <= max_per_tx` → `ExceedsPerTxLimit`
6. `allowed_recipient` check (if set) → `RecipientNotAllowed`
7. Daily reset: if `current_ledger - last_reset_ledger >= 17_280`, reset `spent_today = 0`
8. `spent_today + amount <= daily_limit` → `ExceedsDailyLimit`
9. Calls `token::Client::transfer(contract → recipient, amount)`

Emits: `(symbol("pay"), symbol("exec"), (policy_id, amount))`

---

#### `revoke_policy`

Deactivates a policy. Only the owner can call this.

```
revoke_policy(policy_id: u64)
```

Emits: `(symbol("policy"), symbol("revoke"), policy_id)`

---

#### `get_policy`

Returns the full `SpendingPolicy` struct.

```
get_policy(policy_id: u64) -> SpendingPolicy
```

---

#### `is_authorized`

Returns `true` if the policy is active and the given address is the authorized agent.

```
is_authorized(policy_id: u64, agent: Address) -> bool
```

---

#### `remaining_allowance`

Returns the remaining daily spend allowance in stroops.
If 24 hours (≈17,280 ledgers) have elapsed since the last reset, returns the full `daily_limit`.

```
remaining_allowance(policy_id: u64) -> i128
```

---

#### `policy_count`

Returns the total number of policies ever created.

```
policy_count() -> u64
```

---

### Error Codes

| Code | Value | Meaning |
|---|---|---|
| `PolicyNotFound` | 1 | No policy with that ID exists |
| `NotOwner` | 2 | Caller is not the policy owner |
| `PolicyInactive` | 3 | Policy has been revoked |
| `ExceedsPerTxLimit` | 4 | Amount > `max_per_tx` |
| `ExceedsDailyLimit` | 5 | `spent_today + amount > daily_limit` |
| `InvalidAmount` | 6 | Amount is zero or negative |
| `UnauthorizedAgent` | 7 | Caller is not the authorised agent |
| `RecipientNotAllowed` | 8 | Recipient does not match `allowed_recipient` |

---

### SpendingPolicy Struct

```rust
pub struct SpendingPolicy {
    pub id: u64,
    pub owner: Address,
    pub agent: Address,
    pub max_per_tx: i128,         // in stroops
    pub daily_limit: i128,        // in stroops
    pub asset: String,
    pub issuer: Address,
    pub spent_today: i128,        // resets every ~24h
    pub last_reset_ledger: u32,
    pub total_spent: i128,        // all-time cumulative
    pub is_active: bool,
    pub created_at: u32,          // ledger sequence
    pub allowed_recipient: Option<Address>,
}
```

---

### PaymentRecord Struct

```rust
pub struct PaymentRecord {
    pub policy_id: u64,
    pub agent: Address,
    pub recipient: Address,
    pub amount: i128,
    pub asset: String,
    pub memo: String,
    pub ledger: u32,
}
```

---

## Daily Reset Mechanism

The daily spending window is based on ledger sequence, not wall-clock time:

```
LEDGERS_PER_DAY = 17_280   // 86_400 seconds / 5 seconds per ledger
```

On each `execute_payment` call, if `current_ledger - last_reset_ledger >= 17_280`,
the contract resets `spent_today = 0` and updates `last_reset_ledger`.

This is manipulation-resistant — no oracle required.

---

## Events Reference

All contract events follow the Soroban two-topic pattern: `(topic1, topic2, data)`.

| Event | Contract | Topic 1 | Topic 2 | Data |
|---|---|---|---|---|
| Agent registered | Registry | `"regist"` | `"agent"` | `agent_id: String` |
| Agent updated | Registry | `"update"` | `"agent"` | `agent_id: String` |
| Agent deactivated | Registry | `"deact"` | `"agent"` | `agent_id: String` |
| Reputation updated | Registry | `"repupd"` | `"agent"` | `(agent_id, new_score)` |
| Policy created | Policy | `"policy"` | `"create"` | `policy_id: u64` |
| Policy revoked | Policy | `"policy"` | `"revoke"` | `policy_id: u64` |
| Payment executed | Policy | `"pay"` | `"exec"` | `(policy_id, amount)` |
