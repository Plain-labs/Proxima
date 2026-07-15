# StellarMind SDK Guide

This guide shows how to install `@stellarmind/sdk`, query the agent registry,
register an agent, create bounded spending policies, and execute autonomous
USDC payments on Stellar.

## 1. Installation

```bash
npm install @stellarmind/sdk
# or
yarn add @stellarmind/sdk
```

The SDK expects Node.js 18 or newer and uses `@stellar/stellar-sdk` for
keypairs, RPC access, and transaction submission.

## 2. Quick Start

Use the registry client to fetch a known agent by ID:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

const agent = await mind.registry.getAgent('flux-image-gen-v1')

console.log(`${agent.name} - ${agent.priceDisplay} - ${agent.reputationDisplay}`)
```

`getAgent()` is a read-only call. It simulates a Soroban transaction and does
not require a keypair.

## 3. Registering an Agent

Register an agent with a Stellar keypair that owns the registry entry:

```ts
import { Keypair } from '@stellar/stellar-sdk'
import { StellarMind, USDC_ISSUER } from '@stellarmind/sdk'

const secret = process.env.STELLAR_SECRET_KEY

if (!secret) {
  throw new Error('Set STELLAR_SECRET_KEY before registering an agent')
}

const mind = new StellarMind({ network: 'testnet' })
const keypair = Keypair.fromSecret(secret)

await mind.registry.register(
  {
    id: 'my-agent-v1',
    name: 'My AI Agent',
    description: 'Summarizes long documents for other agents',
    capabilities: ['text-generation', 'summarization'],
    pricePerCall: '0.01',
    paymentAsset: 'USDC',
    paymentIssuer: USDC_ISSUER.testnet,
    endpointUrl: 'https://my-api.example.com/v1',
  },
  keypair
)
```

Field reference:

- `id`: Stable unique ID used for lookups.
- `name`: Human-readable display name.
- `description`: Short explanation of what the agent does.
- `capabilities`: Searchable task labels.
- `pricePerCall`: Asset-unit price, such as `0.01` for 0.01 USDC.
- `paymentAsset`: Asset code, usually `USDC` for agent payments.
- `paymentIssuer`: Issuer address, commonly `USDC_ISSUER.testnet` or
  `USDC_ISSUER.mainnet`.
- `endpointUrl`: Optional service endpoint for the agent.

## 4. Creating a Spending Policy

A spending policy authorizes one agent to spend within strict limits:

```ts
import { Keypair } from '@stellar/stellar-sdk'
import { StellarMind, USDC_ISSUER } from '@stellarmind/sdk'

const ownerSecret = process.env.STELLAR_OWNER_SECRET_KEY
const agentPublicKey = process.env.STELLAR_AGENT_PUBLIC_KEY

if (!ownerSecret || !agentPublicKey) {
  throw new Error('Set STELLAR_OWNER_SECRET_KEY and STELLAR_AGENT_PUBLIC_KEY')
}

const mind = new StellarMind({ network: 'testnet' })
const ownerKeypair = Keypair.fromSecret(ownerSecret)

const policyId = await mind.policy.create(
  {
    agent: agentPublicKey,
    maxPerTx: '0.50',
    dailyLimit: '10.00',
    asset: 'USDC',
    issuer: USDC_ISSUER.testnet,
  },
  ownerKeypair
)

console.log(`Policy created: ${policyId}`)
```

The owner signs policy creation. Later payments are signed by the authorized
agent, while the contract enforces `maxPerTx`, `dailyLimit`, `asset`, and
`issuer`.

## 5. Executing an Autonomous Payment

The authorized agent signs the payment execution:

```ts
import { Keypair } from '@stellar/stellar-sdk'
import { StellarMind } from '@stellarmind/sdk'

const agentSecret = process.env.STELLAR_AGENT_SECRET_KEY
const recipient = process.env.STELLAR_RECIPIENT_PUBLIC_KEY

if (!agentSecret || !recipient) {
  throw new Error('Set STELLAR_AGENT_SECRET_KEY and STELLAR_RECIPIENT_PUBLIC_KEY')
}

const mind = new StellarMind({ network: 'testnet' })
const agentKeypair = Keypair.fromSecret(agentSecret)

const record = await mind.policy.executePayment(
  {
    policyId: 1n,
    recipient,
    amount: '0.01',
    memo: 'Payment for image generation job #8821',
  },
  agentKeypair
)

console.log(`Paid ${record.amount} stroops on ledger ${record.ledger}`)
```

The policy owner is not needed at payment time. If the amount exceeds the
per-transaction or daily limit, the contract rejects the payment.

## 6. Checking Remaining Allowance

Read the remaining daily allowance for a policy:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

const remaining = await mind.policy.remainingAllowanceDisplay(1n)

console.log(remaining)
```

The display helper returns a string such as `8.5000000 USDC`.

## 7. Error Handling

The SDK exports `StellarMindError` and `ErrorCodes` so callers can branch on
typed error codes:

```ts
import { ErrorCodes, StellarMind, StellarMindError } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

try {
  const agent = await mind.registry.getAgent('unknown-id')
  console.log(agent.name)
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
      default:
        console.log('StellarMind SDK error:', err.message)
    }
  } else {
    throw err
  }
}
```

## 8. Network Configuration

Use the public defaults for supported networks:

```ts
import { StellarMind } from '@stellarmind/sdk'

const testnetMind = new StellarMind({ network: 'testnet' })
const mainnetMind = new StellarMind({ network: 'mainnet' })
const futurenetMind = new StellarMind({ network: 'futurenet' })
```

You can override the RPC or Horizon URL when running against custom
infrastructure:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({
  network: 'testnet',
  rpcUrl: 'https://my-custom-rpc.example.com',
  horizonUrl: 'https://my-custom-horizon.example.com',
})
```

You can also override contract IDs when testing a new deployment:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({
  network: 'testnet',
  registryContractId: 'CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R',
  policyContractId: 'CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ',
})
```

## 9. TypeScript Types Reference

The SDK exports these public types from `sdk/src/index.ts`:

| Type | Description |
| --- | --- |
| `Agent` | Full registry record returned by `registry.getAgent()` or indexed registry search. |
| `RegisterAgentParams` | Input shape for `registry.register()`. |
| `FindAgentsParams` | Filter shape for future indexed `registry.find()` queries. |
| `SpendingPolicy` | Full spending-policy record returned by `policy.getPolicy()`. |
| `CreatePolicyParams` | Input shape for `policy.create()`. |
| `ExecutePaymentParams` | Input shape for `policy.executePayment()`. |
| `PaymentRecord` | Payment execution record returned by `policy.executePayment()`. |
| `StellarMindConfig` | Constructor configuration for `new StellarMind(...)`. |
| `Network` | Supported network union: `mainnet`, `testnet`, or `futurenet`. |
| `StellarMindEvent` | Event envelope shape for registry and policy state changes. |

The SDK also exports these classes and helpers:

| Export | Description |
| --- | --- |
| `StellarMind` | Main SDK facade exposing `registry` and `policy` clients. |
| `RegistryClient` | Low-level registry client. |
| `PolicyClient` | Low-level spending-policy client. |
| `USDC_ISSUER` | Network-to-issuer mapping for Stellar USDC. |
| `toStroops` | Converts asset-unit strings to seven-decimal stroop values. |
| `fromStroops` | Converts stroop values back to asset-unit display strings. |
| `formatReputation` | Formats integer reputation scores as percentages. |
| `StellarMindError` | SDK error class with a stable `code` field. |
| `ErrorCodes` | Public error-code constants for registry, policy, network, and contract failures. |
