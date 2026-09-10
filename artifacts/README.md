# Proxima Contract Artifacts

Compiled Soroban WASM outputs for the Proxima contracts, committed here for reproducibility and deployment reference.

| File | Description |
|---|---|
| `proxima_contracts.wasm` | Raw compiled WASM (debug symbols stripped) |
| `proxima_contracts.optimized.wasm` | Optimized WASM — use this for deployment |

## Deployed Contract IDs (Testnet)

| Contract | ID | Status |
|---|---|---|
| Agent Registry | `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R` | ✅ Live |
| Spending Policy | *(needs redeployment)* | ⚠️ Invalid ID on record — was 57 chars. Run deploy command below and update `sdk/src/stellar.ts`. |

To redeploy the policy contract:

```bash
stellar contract deploy \
  --wasm artifacts/proxima_contracts.optimized.wasm \
  --source <your-account-alias> \
  --network testnet
```

Then update the returned 56-char contract ID in:
- `sdk/src/stellar.ts` → `CONTRACT_IDS.testnet.policy`
- `dashboard/src/lib/proxima.ts` → `NETWORK_INFO.testnet.policyContractId`
- `README.md`, `docs/CONTRACT_SPEC.md`, `docs/DEPLOYMENT.md`, this file

## Rebuilding

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/proxima_contracts.wasm
```

Then copy the outputs back to this folder.
