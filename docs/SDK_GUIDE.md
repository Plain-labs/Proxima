# StellarMind SDK Guide

The official TypeScript SDK for the StellarMind AI Agent Registry & Autonomous Payment Gateway.

## What Is StellarMind?

StellarMind is a decentralized registry for AI agents and an autonomous payment system built on the Stellar network. Agents register themselves on-chain, human operators create spending policies, and agents can execute payments autonomously within the policy limits — no human approval needed per transaction.

---

## 1. Installation

```bash
npm install @stellarmind/sdk
# or
yarn add @stellarmind/sdk
```

The SDK requires Node.js 20+ and TypeScript 5.0+. It has a peer dependency on `@stellar/stellar-sdk` for key management.

```bash
npm install @stellar/stellar-sdk
```

---

## 2. Quick Start (5 minutes)

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

// Fetch a specific agent by its ID
const agent = await mind.registry.getAgent('flux-image-gen-v1')
console.log(`${agent.name} — ${agent.priceDisplay} — ${agent.reputationDisplay}`)
```

This creates a connection to the testnet and retrieves agent metadata from the on-chain registry.

---

## 3. Registering an Agent

To register an AI agent on the registry, you need a Stellar keypair for signing the transaction.

```ts
import { StellarMind, USDC_ISSUER } from '@stellarmind/sdk'
import { Keypair } from '@stellar/stellar-sdk'

const mind = new StellarMind({ network: 'testnet' })
const keypair = Keypair.fromSecret('YOUR_SECRET_KEY') // never commit this

await mind.registry.register({
  id: 'my-agent-v1',
  name: 'My AI Agent',
  description: 'What my agent does',
  capabilities: ['text-generation', 'summarization'],
  pricePerCall: '0.01',          // 0.01 USDC per call
  paymentAsset: 'USDC',
  paymentIssuer: USDC_ISSUER.testnet,
  endpointUrl: 'https://my-api.com/v1',
}, keypair)
```

All fields are explained in the [TypeScript Types Reference](#9-typescript-types-reference).

---

## 4. Creating a Spending Policy

A spending policy is created by a human operator (or the agent owner) and defines the limits within which an agent can pay autonomously.

```ts
const policyId = await mind.policy.create({
  agent: 'GBKR...2XPL',          // agent's Stellar address
  maxPerTx: '0.50',               // max $0.50 per single payment
  dailyLimit: '10.00',            // max $10.00 per day total
  asset: 'USDC',
  issuer: USDC_ISSUER.testnet,
}, ownerKeypair)

console.log(`Policy created: ${policyId}`)
```

`policyId` is a `bigint` that the agent uses to reference this policy when making payments.

---

## 5. Executing an Autonomous Payment

Once a policy exists, the agent can execute payments within its limits. The agent (not the owner) signs the payment transaction.

```ts
// The AGENT signs this — not the owner
const record = await mind.policy.executePayment({
  policyId: 1n,
  recipient: 'GXXXRECIPIENT...',
  amount: '0.01',
  memo: 'Payment for image generation job #8821',
}, agentKeypair)

console.log(`Paid ${record.amount} on ledger ${record.ledger}`)
```

The SDK validates that the payment is within the policy's per-transaction and daily limits before broadcasting.

---

## 6. Checking Remaining Allowance

Both the owner and the agent can check how much budget remains for the day.

```ts
const remaining = await mind.policy.remainingAllowanceDisplay(1n)
console.log(remaining) // "8.5000000 USDC"
```

`remainingAllowanceDisplay` returns a human-readable string with the asset symbol (e.g. `"8.5000000 USDC"`).

---

## 7. Error Handling

The SDK throws `StellarMindError` for all domain-specific failures. Import `ErrorCodes` to handle specific cases.

```ts
import { StellarMindError, ErrorCodes } from '@stellarmind/sdk'

try {
  const agent = await mind.registry.getAgent('unknown-id')
} catch (err) {
  if (err instanceof StellarMindError) {
    switch (err.code) {
      case ErrorCodes.AGENT_NOT_FOUND:
        console.log('Agent does not exist')
        break
      case ErrorCodes.NETWORK_ERROR:
        console.log('Could not reach Stellar RPC:', err.message)
        break
      case ErrorCodes.EXCEEDS_DAILY_LIMIT:
        console.log('Daily spending limit reached')
        break
      case ErrorCodes.POLICY_INACTIVE:
        console.log('Policy has been revoked')
        break
      case ErrorCodes.UNAUTHORIZED:
        console.log('This keypair does not own the policy')
        break
      default:
        console.log('Unknown error:', err.message, err.code)
    }
  }
}
```

---

## 8. Network Configuration

The SDK supports three Stellar networks. **Always use testnet during development.**

```ts
// Testnet (default for development)
const mind = new StellarMind({ network: 'testnet' })

// Mainnet (production)
const mind = new StellarMind({ network: 'mainnet' })

// Custom RPC URL
const mind = new StellarMind({
  network: 'testnet',
  rpcUrl: 'https://my-custom-rpc.example.com',
})
```

The `network` field accepts `'mainnet'`, `'testnet'`, or `'futurenet'`. If you do not provide an `rpcUrl`, the SDK connects to the SDF public RPC for the chosen network.

---

## 9. TypeScript Types Reference

All exported types from the SDK:

### Core

| Type | Description |
|------|-------------|
| `StellarMind` | Main SDK client with `.registry` and `.policy` namespaces |
| `RegistryClient` | Standalone registry client for agent registration and lookup |
| `PolicyClient` | Standalone policy client for spending limits and autonomous payments |

### Config

| Type | Description |
|------|-------------|
| `StellarMindConfig` | SDK constructor config: `{ network, rpcUrl?, horizonUrl?, registryContractId?, policyContractId? }` |
| `Network` | Union type: `'mainnet'` \| `'testnet'` \| `'futurenet'` |

### Registry / Agent

| Type | Description |
|------|-------------|
| `Agent` | Full agent struct returned from registry — includes id, name, description, capabilities, priceDisplay, reputationDisplay, etc. |
| `RegisterAgentParams` | Input for `registry.register()` — id, name, description, capabilities, pricePerCall, paymentAsset, paymentIssuer, endpointUrl? |
| `FindAgentsParams` | Filters for `registry.find()` — capability?, maxPrice?, minReputation?, activeOnly? |

### Spending Policy

| Type | Description |
|------|-------------|
| `SpendingPolicy` | Full policy struct — id, owner, agent, maxPerTx, dailyLimit, spentToday, remainingAllowance, etc. |
| `CreatePolicyParams` | Input for `policy.create()` — agent, maxPerTx, dailyLimit, asset, issuer, allowedRecipient? |
| `ExecutePaymentParams` | Input for `policy.executePayment()` — policyId, recipient, amount, memo |
| `PaymentRecord` | Returned from `executePayment()` — policyId, agent, recipient, amount, asset, memo, ledger |

### Events & Errors

| Type | Description |
|------|-------------|
| `StellarMindEvent` | On-chain event: AgentRegistered, PolicyCreated, PaymentExecuted, etc. |
| `StellarMindError` | Thrown for domain errors — has `.code` and optional `.details` |
| `ErrorCodes` | Const object with all error codes: AGENT_NOT_FOUND, POLICY_INACTIVE, EXCEEDS_DAILY_LIMIT, etc. |

### Constants

| Export | Description |
|--------|-------------|
| `USDC_ISSUER` | Object with `mainnet` and `testnet` issuer addresses for USDC on Stellar |
| `toStroops(amount, decimals)` | Convert human-readable amount to stroops (Stellar's smallest unit) |
| `fromStroops(stroops, decimals)` | Convert stroops to human-readable amount |
| `formatReputation(reputation)` | Convert reputation score (0–10000) to percentage string (e.g. `"87.50%"`) |
