# Deployment Guide

This guide covers how to build, test, and deploy the Proxima Soroban contracts
to Stellar Testnet and Mainnet.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable (1.75+) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `wasm32-unknown-unknown` target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | 21.x | `cargo install --locked stellar-cli --features opt` |
| Node.js | 18+ | https://nodejs.org |
| Bun | 1.x | `npm install -g bun` |

Verify your setup:
```bash
stellar --version
rustc --version
```

---

## 1. Build the Contracts

```bash
cd contracts
cargo build --release --target wasm32-unknown-unknown
```

The compiled WASM files are output to:
```
contracts/target/wasm32-unknown-unknown/release/proxima_contracts.wasm
```

To produce the optimised artifact used for deployment:
```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/proxima_contracts.wasm \
  --wasm-out ../artifacts/proxima_contracts.optimized.wasm
```

---

## 2. Run Contract Tests

```bash
cd contracts
cargo test
```

This runs all tests in `contracts/tests/`. Expected output:

```
running 16 tests
test registry_test::test_register_agent_success ... ok
test registry_test::test_register_duplicate_fails ... ok
test registry_test::test_reputation_update ... ok
test registry_test::test_agent_count ... ok
test registry_test::test_deactivate_agent ... ok
test policy_test::test_create_policy_success ... ok
test policy_test::test_create_policy_with_allowed_recipient ... ok
...
test result: ok. 16 passed; 0 failed
```

---

## 3. Set Up a Stellar Account

### Testnet (free)

```bash
# Generate a new keypair
stellar keys generate deployer --network testnet

# Fund it via friendbot
stellar keys fund deployer --network testnet

# Check balance
stellar account get deployer --network testnet
```

### Mainnet

You'll need a funded mainnet account. Import an existing key:
```bash
stellar keys import deployer --secret-key
# paste your secret key when prompted
```

---

## 4. Deploy the Registry Contract

```bash
stellar contract deploy \
  --wasm ../artifacts/proxima_contracts.optimized.wasm \
  --source deployer \
  --network testnet \
  -- \
  --contract-name registry

# The command prints the contract ID, e.g.:
# CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R
```

Save the contract ID — you'll need it for the SDK and dashboard config.

---

## 5. Deploy the Spending Policy Contract

The policy and registry contracts are compiled from the same WASM binary.
Deploy a second instance:

```bash
stellar contract deploy \
  --wasm ../artifacts/proxima_contracts.optimized.wasm \
  --source deployer \
  --network testnet \
  -- \
  --contract-name policy

# e.g.: CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ
```

---

## 6. Verify Deployment

```bash
# Check registry responds
stellar contract invoke \
  --id CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R \
  --source deployer \
  --network testnet \
  -- \
  agent_count

# Should output: 0
```

---

## 7. Update SDK Config

Open `sdk/src/stellar.ts` and update the `CONTRACT_IDS` record with your
new contract addresses:

```ts
const CONTRACT_IDS: Record<Network, { registry: string; policy: string }> = {
  testnet: {
    registry: 'C...YOUR_REGISTRY_CONTRACT_ID',
    policy:   'C...YOUR_POLICY_CONTRACT_ID',
  },
  // ...
}
```

---

## 8. Deploy the Dashboard

The dashboard is a Vite React app. Build and deploy it like any static site.

### Build

```bash
cd dashboard
bun install
bun run build
# output in dashboard/dist/
```

### Environment variables

Create `dashboard/.env.local` for local development:

```env
VITE_NETWORK=testnet
VITE_REGISTRY_CONTRACT_ID=C...
VITE_POLICY_CONTRACT_ID=C...
```

### Deploy to Vercel

```bash
cd dashboard
npx vercel --prod
```

Set the same environment variables in the Vercel project settings.

---

## 9. Mainnet Deployment Checklist

Before deploying to Mainnet:

- [ ] All contract tests pass (`cargo test`)
- [ ] Contracts have been reviewed for security issues
- [ ] Testnet deployment has been running for at least 2 weeks
- [ ] Contract IDs are updated in `sdk/src/stellar.ts`
- [ ] USDC issuer address verified: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- [ ] Dashboard env vars set to `mainnet`
- [ ] README updated with mainnet contract IDs

---

## Contract Addresses Reference

| Contract | Network | Address |
|---|---|---|
| Registry | Testnet | `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R` |
| Policy | Testnet | `CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ` |
| Registry | Mainnet | TBD — post deployment |
| Policy | Mainnet | TBD — post deployment |

---

## Troubleshooting

### `Error: account not found`
The deployer account isn't funded. Run `stellar keys fund deployer --network testnet`.

### `Error: contract already exists`
The contract is already deployed at that address. Use the existing contract ID
or deploy with a different account.

### WASM too large
Run the optimizer step (section 1) before deploying. Unoptimised WASM can
exceed Stellar's contract size limits.

### `insufficient balance`
The deployer account needs at least 5 XLM to cover deployment fees and
storage deposits. Fund with more XLM before retrying.
