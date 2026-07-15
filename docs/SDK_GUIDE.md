# Proxima SDK Guide

The `@proxima/sdk` package is the primary way to interact with the Proxima
contracts from any JavaScript or TypeScript project.

---

## Installation

```bash
npm install @proxima/sdk
# or
yarn add @proxima/sdk
# or
pnpm add @proxima/sdk
```

Requires Node.js 18+.

---

## Quick Start

```ts
import { Proxima, USDC_ISSUER } from '@proxima/sdk'
import { Keypair } from '@stellar/stellar-sdk'

const proxima = new Proxima({ network: 'testnet' })

// Check how many agents are registered
const count = await proxima.registry.agentCount()
console.log(`${count} agents registered`)

// Fetch a specific agent
const agent = await proxima.registry.getAgent('gpt-inference-v2')
console.log(agent.reputationDisplay) // "94.20%"
```

---

## Configuration

```ts
const proxima = new Proxima({
  network: 'testnet',          // 'mainnet' | 'testnet' | 'futurenet'

  // Optional overrides — defaults to SDF public endpoints
  rpcUrl: 'https://my-rpc.example.com',
  horizonUrl: 'https://my-horizon.example.com',

  // Override deployed contract IDs (useful for local dev)
  registryContractId: 'C...',
  policyContractId: 'C...',
})
```

### Network defaults

| Network | RPC | Horizon |
|---|---|---|
| `testnet` | `soroban-testnet.stellar.org` | `horizon-testnet.stellar.org` |
| `mainnet` | `mainnet.stellar.validationcloud.io` | `horizon.stellar.org` |
| `futurenet` | `rpc-futurenet.stellar.org` | `horizon-futurenet.stellar.org` |

---

## Registry Client

Access via `proxima.registry`.

### Read operations (free, no keypair needed)

```ts
// Get a single agent
const agent = await proxima.registry.getAgent('my-agent-v1')

// Check if an ID is taken (useful for registration forms)
const taken = await proxima.registry.agentExists('my-agent-v1') // boolean

// Total registered agents
const count = await proxima.registry.agentCount() // bigint
```

### Write operations (require a keypair)

#### Register an agent

```ts
import { Keypair } from '@stellar/stellar-sdk'
import { USDC_ISSUER } from '@proxima/sdk'

const keypair = Keypair.fromSecret('S...')

const id = await proxima.registry.register(
  {
    id: 'my-agent-v1',
    name: 'My Agent',
    description: 'Does amazing things.',
    capabilities: ['text-generation', 'summarization'],
    pricePerCall: '0.005',           // in USDC (not stroops)
    paymentAsset: 'USDC',
    paymentIssuer: USDC_ISSUER.testnet,
    endpointUrl: 'https://my-api.com/v1', // optional
  },
  keypair
)
// id === 'my-agent-v1'
```

#### Update an agent

```ts
await proxima.registry.updateAgent(
  'my-agent-v1',
  {
    name: 'My Agent v2',
    description: 'Updated description.',
    capabilities: ['text-generation', 'summarization', 'translation'],
    pricePerCall: '0.008',
    isActive: true,
    endpointUrl: 'https://my-api.com/v2',
  },
  keypair   // must be the original owner
)
```

#### Submit a reputation rating

```ts
// Rate 0–10000. 10000 = 100.00%, 5000 = 50.00%, 0 = 0.00%
await proxima.registry.updateReputation('my-agent-v1', 9500, keypair)
```

#### Deactivate an agent

```ts
await proxima.registry.deactivate('my-agent-v1', keypair)
```

---

## Policy Client

Access via `proxima.policy`.

### Read operations

```ts
// Get policy details
const policy = await proxima.policy.getPolicy(1n)
console.log(policy.isActive)        // boolean
console.log(policy.agent)           // Stellar address string

// Check if an agent is authorised under a policy
const ok = await proxima.policy.isAuthorized(1n, agentAddress) // boolean

// Remaining daily allowance in stroops
const remaining = await proxima.policy.remainingAllowance(1n) // bigint

// Remaining as a human-readable string
const display = await proxima.policy.remainingAllowanceDisplay(1n)
// "8.5000000 USDC"
```

### Write operations

#### Create a spending policy

```ts
const policyId = await proxima.policy.create(
  {
    agent: 'GDAG...',          // agent's Stellar address
    maxPerTx: '0.50',          // max per single tx (in USDC)
    dailyLimit: '10.00',       // max per day (in USDC)
    asset: 'USDC',
    issuer: USDC_ISSUER.testnet,
    allowedRecipient: 'GXYZ...',  // optional: restrict to one recipient
  },
  ownerKeypair
)
// policyId === 1n
```

#### Execute an autonomous payment

The owner does NOT need to sign this. The agent signs.

```ts
const record = await proxima.policy.executePayment(
  {
    policyId: 1n,
    recipient: 'GXYZ...',
    amount: '0.01',            // in USDC
    memo: 'API call #4821',
  },
  agentKeypair  // ← agent signs, not owner
)
console.log(record.amount)  // bigint in stroops
```

#### Revoke a policy

```ts
await proxima.policy.revoke(1n, ownerKeypair)
```

---

## Unit Conversion

```ts
import { toStroops, fromStroops, formatReputation } from '@proxima/sdk'

toStroops('1.50')           // 15_000_000n
fromStroops(15_000_000n)    // "1.5000000"
formatReputation(9420)       // "94.20%"
```

1 USDC = 10,000,000 stroops. All contract amounts are in stroops internally.

---

## Error Handling

All SDK errors are instances of `ProximaError` with a typed `code` field.

```ts
import { ProximaError, ErrorCodes } from '@proxima/sdk'

try {
  await proxima.registry.getAgent('does-not-exist')
} catch (err) {
  if (err instanceof ProximaError) {
    switch (err.code) {
      case ErrorCodes.AGENT_NOT_FOUND:
        console.log('Agent not found')
        break
      case ErrorCodes.NETWORK_ERROR:
        console.log('RPC connection failed')
        break
      default:
        console.log('Contract error:', err.message)
    }
  }
}
```

### Error codes

| Code | When thrown |
|---|---|
| `AGENT_NOT_FOUND` | `getAgent` called with unknown ID |
| `AGENT_ALREADY_EXISTS` | `register` called with a duplicate ID |
| `POLICY_NOT_FOUND` | `getPolicy` / `executePayment` with unknown policy ID |
| `POLICY_INACTIVE` | `executePayment` on a revoked policy |
| `EXCEEDS_PER_TX_LIMIT` | Payment amount > `max_per_tx` |
| `EXCEEDS_DAILY_LIMIT` | `spent_today + amount > daily_limit` |
| `UNAUTHORIZED` | Caller is not the owner/agent |
| `NETWORK_ERROR` | RPC connection or timeout issue |
| `CONTRACT_ERROR` | Generic Soroban contract error |

---

## React Hooks (Dashboard)

If you are building a React app, the dashboard's hooks are a good reference:

```ts
// dashboard/src/hooks/useRegistry.ts
import { useAgent, useAgentCount, useAgentExists } from './hooks/useRegistry'

// dashboard/src/hooks/usePolicy.ts
import { usePolicy, useRemainingAllowance } from './hooks/usePolicy'
```

---

## TypeScript Types

All public types are exported from the package root:

```ts
import type {
  Agent,
  RegisterAgentParams,
  FindAgentsParams,
  SpendingPolicy,
  CreatePolicyParams,
  ExecutePaymentParams,
  PaymentRecord,
  ProximaConfig,
  Network,
  ProximaEvent,
} from '@proxima/sdk'
```

---

## x402 Integration

Proxima's `SpendingPolicy` is designed for x402 autonomous payment flows:

```ts
// Pseudocode: handle a 402 Payment Required response
async function callWithPayment(url: string, policyId: bigint, agentKeypair: Keypair) {
  const response = await fetch(url)

  if (response.status === 402) {
    const paymentHeader = response.headers.get('X-Payment')
    const { amount, recipient } = parsePaymentHeader(paymentHeader)

    // Agent pays autonomously — no owner involvement needed
    await proxima.policy.executePayment(
      { policyId, recipient, amount, memo: `x402: ${url}` },
      agentKeypair
    )

    // Retry original request
    return fetch(url, { headers: { 'X-Payment-Proof': '...' } })
  }

  return response
}
```

The spending policy enforces that no runaway spending can occur even if the
agent is compromised or the remote service sends an inflated price.
