# Changelog

All notable changes to Proxima are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Contracts
- **fix:** Require owner auth on `update_reputation()` — add `caller: Address` parameter with `caller.require_auth()` and `caller == agent.owner` assertion. Prevents arbitrary addresses from gaming reputation scores.
- **fix:** Add `#[allow(clippy::too_many_arguments)]` to `PolicyContract` impl block and `create_policy()` to resolve macro-expanded Clippy false positives under `-D warnings`.
- **fix:** Pin `rust-toolchain.toml` to `1.88` — the minimum version satisfying all transitive dependency constraints (`edition2024`, `darling@0.23`, `serde_with@3.21`). Declare `wasm32-unknown-unknown` target and `rustfmt`/`clippy` components in the file for reproducible dev environments.
- **test:** Add `test_reputation_unauthorized_caller_panics` — verifies a stranger cannot submit a reputation rating.
- **fix:** Update `format!("agent-{}", i)` → `format!("agent-{i}")` in `registry_test.rs` to satisfy `uninlined_format_args` lint.

### Dashboard
- **fix:** Replace hardcoded `$48,291` and `87.4%` stats with live derived values. New `useNetworkStats()` hook computes USDC transacted (`price_per_call × total_calls` summed across all agents) and average reputation from the live registry. Falls back to mock data when RPC is unavailable.
- **refactor:** Extract `AgentCard` and `DisplayAgent` into standalone `AgentCard.tsx`. `AgentExplorer.tsx` now imports from it — removes ~200 lines of inline code.
- **fix:** Remove redundant `targets`/`components` from CI workflow files — `dtolnay/rust-toolchain@stable` reads them from `rust-toolchain.toml`.

### SDK
- **fix:** Update `updateReputation()` to pass `keypair.publicKey()` as the `caller` argument to match the updated contract signature.

---

## [0.1.1] — 2026-09-10

### Contracts
- **fix:** Add `owner.require_auth()` to `register()` and `create_policy()` — both functions now enforce that the declared owner has signed the transaction.
- **fix:** Remove test snapshots from git tracking.

### Dashboard
- **feat:** Add `ReputationSparkline` component to `AgentCard` expanded view — shows a mini sparkline of the agent's reputation trend over recent interactions.
- **refactor:** Use `React.useId` for stable gradient IDs in the sparkline to avoid hydration mismatches.

### SDK
- **feat:** Add React hooks package (`useRegistry`, `usePolicy`, `useEventFeed`, `useFreighter`) for consuming the Proxima SDK in React applications.

---

## [0.1.0] — 2026-07-19

Initial public release of the Proxima stack.

### Contracts
- Agent Registry Soroban contract (`registry.rs`) — register, get, update, deactivate, reputation, agent_count
- Spending Policy Soroban contract (`policy.rs`) — create, execute_payment, revoke, is_authorized, remaining_allowance, policy_count
- Shared types (`types.rs`) — `Agent`, `SpendingPolicy`, `PaymentRecord`, `ProximaEvent`, `DataKey`
- 45 tests across two test files covering all state-modifying paths, authorization enforcement, Bayesian reputation math, and all `execute_payment` error conditions
- Both contracts deployed to Stellar Testnet
  - Registry: `CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R`
  - Policy: `CCU6OJRXDPI4SRBL7ZJPUBTQY633ND2OLDQPMHDD4QBKAZ7IMJ3TUEBZ`
- CI: `cargo fmt`, `clippy -D warnings`, `cargo test`, WASM build on every push to `/contracts`

### SDK (`@proxima/sdk` v0.1.0)
- `RegistryClient` — `getAgent`, `agentExists`, `agentCount`, `find`, `register`, `updateAgent`, `updateReputation`, `deactivate`
- `PolicyClient` — `createPolicy`, `executePayment`, `revokePolicy`, `getPolicy`, `isAuthorized`, `remainingAllowance`, `policyCount`
- Browser-wallet signing path — `buildRegisterTx`, `buildCreatePolicyTx`, `buildRevokePolicyTx`, `submitSignedTx` for Freighter integration
- Stellar utilities — `toStroops`, `fromStroops`, `formatReputation`, `resolveConfig`, `USDC_ISSUER`
- 39 unit tests via `bun test`
- 4 working examples: `register-agent.ts`, `autonomous-payment.ts`, `x402-autonomous-payment.ts`, `x402-integration.ts`
- Dual CJS + ESM output with TypeScript declarations
- CI: type check, lint, `bun test`, build on every push to `/sdk`

### Dashboard
- Agent Explorer — live on-chain registry with search, capability filter, sort by reputation/calls/price, mock data fallback with `DEMO DATA` badge
- Register Agent — Freighter-wired registration form with debounced ID availability badge, spinner, success/error screens
- Policy Manager — create and revoke spending policies via Freighter
- Activity Feed — real-time Stellar Horizon SSE event stream
- Wallet Connect — Freighter connection and state management
- Live on-chain stats bar — agent count and policy count from contract queries
- Live deployment: https://nullius-taupe.vercel.app/

### Docs
- `ARCHITECTURE.md`, `CONTRACT_SPEC.md`, `SDK_GUIDE.md`, `DEPLOYMENT.md`, `SECURITY.md`
- `SECURITY.md` includes full threat model, authorization model, known limitations, and responsible disclosure process

---

## [0.0.1] — 2026-06-09

- Initial contract deployment and configuration
- Monorepo scaffold with `sdk` and `dashboard` workspaces
- Basic SDK structure and dependency installation
