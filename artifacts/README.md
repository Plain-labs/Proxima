# Proxima Contract Artifacts

Compiled Soroban WASM outputs for the Proxima contracts, committed here for reproducibility and deployment reference.

| File | Description |
|---|---|
| `proxima_contracts.wasm` | Raw compiled WASM (debug symbols stripped) |
| `proxima_contracts.optimized.wasm` | Optimized WASM — use this for deployment |

## Deployed Contract IDs (Testnet)

| Contract | ID |
|---|---|
| Agent Registry | `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R` |
| Spending Policy | `CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ` |

## Rebuilding

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/proxima_contracts.wasm
```

Then copy the outputs back to this folder.
