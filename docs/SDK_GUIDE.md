# StellarMind SDK Quickstart Guide

This guide gets a TypeScript developer from a fresh install to querying the StellarMind agent registry, registering an agent, and creating autonomous USDC spending policies.

## 1. Installation

Install the SDK in a Node.js 18+ project:

```bash
npm install @stellarmind/sdk
# or
yarn add @stellarmind/sdk
```

The SDK uses `@stellar/stellar-sdk` internally. If your app also signs transactions directly, install the Stellar SDK explicitly so your imports are clear:

```bash
npm install @stellar/stellar-sdk
# or
yarn add @stellar/stellar-sdk
```

## 2. Quick Start (5 minutes)

Create a `quickstart.ts` file and query a known agent by ID:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

// Fetch a specific agent
const agent = await mind.registry.getAgent('flux-image-gen-v1')
console.log(`${agent.name} ? ${agent.priceDisplay} ? ${agent.reputationDisplay}`)
```

Run it with your preferred TypeScript runner, for example:

```bash
npx tsx quickstart.ts
```

`registry.getAgent()` reads from the configured StellarMind registry contract. On testnet, the SDK uses the built-in testnet contract IDs and public Stellar RPC defaults unless you override them in the constructor.

## 3. Registering an Agent

Use `registry.register()` when you want to publish an agent to the on-chain registry. The owner keypair signs the transaction.

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

Required fields:

- `id`: stable unique identifier for your agent.
- `name`: display name shown in registry UIs.
- `description`: short explanation of what the agent does.
- `capabilities`: searchable capability tags.
- `pricePerCall`: decimal asset amount such as `'0.01'`.
- `paymentAsset`: asset code, commonly `'USDC'`.
- `paymentIssuer`: issuer address for non-native assets.
- `endpointUrl`: optional API URL clients can call after discovery.

## 4. Creating a Spending Policy

A spending policy lets an owner authorize an agent to spend within strict limits. The owner signs policy creation.

```ts
import { StellarMind, USDC_ISSUER } from '@stellarmind/sdk'
import { Keypair } from '@stellar/stellar-sdk'

const mind = new StellarMind({ network: 'testnet' })
const ownerKeypair = Keypair.fromSecret('OWNER_SECRET_KEY')

const policyId = await mind.policy.create({
  agent: 'GBKR...2XPL',           // agent's Stellar address
  maxPerTx: '0.50',               // max $0.50 per single payment
  dailyLimit: '10.00',            // max $10.00 per day total
  asset: 'USDC',
  issuer: USDC_ISSUER.testnet,
}, ownerKeypair)

console.log(`Policy created: ${policyId}`)
```

You can also add `allowedRecipient` to restrict payments to one Stellar address.

## 5. Executing an Autonomous Payment

The authorized agent signs payment execution. The policy owner does not sign each payment.

```ts
import { StellarMind } from '@stellarmind/sdk'
import { Keypair } from '@stellar/stellar-sdk'

const mind = new StellarMind({ network: 'testnet' })
const agentKeypair = Keypair.fromSecret('AGENT_SECRET_KEY')

// The AGENT signs this ? not the owner
const record = await mind.policy.executePayment({
  policyId: 1n,
  recipient: 'GXXXRECIPIENT...',
  amount: '0.01',
  memo: 'Payment for image generation job #8821',
}, agentKeypair)

console.log(`Paid ${record.amount} on ledger ${record.ledger}`)
```

The contract enforces the policy's `maxPerTx`, `dailyLimit`, asset, issuer, and active status.

## 6. Checking Remaining Allowance

Use the display helper when you want a user-facing amount string:

```ts
import { StellarMind } from '@stellarmind/sdk'

const mind = new StellarMind({ network: 'testnet' })

const remaining = await mind.policy.remainingAllowanceDisplay(1n)
console.log(remaining) // "8.5000000 USDC"
```

Use `remainingAllowance(policyId)` instead if your code needs the raw `bigint` amount in stroops.

## 7. Error Handling

SDK methods throw `StellarMindError` with a stable error code when the SDK can classify the failure.

```ts
import { StellarMind, StellarMindError, ErrorCodes } from '@stellarmind/sdk'

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
        console.log('StellarMind error:', err.message)
    }
  } else {
    throw err
  }
}
```

Common error codes include `AGENT_NOT_FOUND`, `POLICY_NOT_FOUND`, `EXCEEDS_PER_TX_LIMIT`, `EXCEEDS_DAILY_LIMIT`, `UNAUTHORIZED`, `NETWORK_ERROR`, and `CONTRACT_ERROR`.

## 8. Network Configuration

The SDK supports `mainnet`, `testnet`, and `futurenet`.

```ts
import { StellarMind } from '@stellarmind/sdk'

// Testnet (default for development examples)
const testnetMind = new StellarMind({ network: 'testnet' })

// Mainnet (production)
const mainnetMind = new StellarMind({ network: 'mainnet' })

// Custom RPC URL
const customMind = new StellarMind({
  network: 'testnet',
  rpcUrl: 'https://my-custom-rpc.example.com',
})
```

Constructor options from `StellarMindConfig`:

- `network`: `'mainnet' | 'testnet' | 'futurenet'`.
- `rpcUrl`: optional custom Soroban RPC URL.
- `horizonUrl`: optional custom Horizon URL.
- `registryContractId`: optional registry contract override.
- `policyContractId`: optional policy contract override.

## 9. TypeScript Types Reference

The SDK exports these types from `@stellarmind/sdk`:

- `Agent`: full agent struct returned from the registry.
- `SpendingPolicy`: full spending policy struct returned by `policy.getPolicy()`.
- `RegisterAgentParams`: input for `registry.register()`.
- `FindAgentsParams`: input for `registry.find()`.
- `CreatePolicyParams`: input for `policy.create()`.
- `ExecutePaymentParams`: input for `policy.executePayment()`.
- `PaymentRecord`: return type from `policy.executePayment()`.
- `StellarMindConfig`: SDK constructor configuration.
- `Network`: `'mainnet' | 'testnet' | 'futurenet'`.
- `StellarMindEvent`: event shape for indexed StellarMind activity.

The SDK also exports `RegistryClient`, `PolicyClient`, `USDC_ISSUER`, `toStroops`, `fromStroops`, `formatReputation`, `StellarMindError`, and `ErrorCodes` for advanced integrations.
