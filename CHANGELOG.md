# Changelog

All notable changes to Proxima are documented here.

---

## [Unreleased] — chore/ci-and-scaffolding

### SDK

- **feat:** Add `buildRegisterTx`, `buildCreatePolicyTx`, `buildRevokePolicyTx`, and `submitSignedTx` methods to `RegistryClient` and `PolicyClient` for browser-wallet (Freighter) signing flows. Transactions are built and prepared on-chain, returned as unsigned XDR, signed externally, and submitted via `submitSignedTx`.
- **fix:** Defer `Contract` instantiation in `RegistryClient` and `PolicyClient` to first method call (lazy accessor). Previously the constructor threw on empty contract IDs (e.g. mainnet before deployment).
- **test:** Add 39 unit tests via `bun test` across three suites:
  - `stellar.test.ts` — `toStroops`, `fromStroops`, `formatReputation`, `resolveConfig`, `USDC_ISSUER`
  - `types.test.ts` — `ProximaError`, `ErrorCodes`
  - `proxima.test.ts` — `Proxima`, `RegistryClient`, `PolicyClient` instantiation
- **chore:** Replace Jest + ts-jest with `bun test`. Remove `jest.config.ts`. Update `package.json` test script.

### Dashboard

- **feat:** Wire `RegisterAgent` "DEPLOY TO STELLAR" button to Freighter + SDK. Builds an unsigned transaction via `registry.buildRegisterTx()`, prompts Freighter to sign, submits via `submitSignedTx()`. Shows spinner during signing, success screen with explorer link, error screen with retry.
- **feat:** Extract `RegisterAgent` from `ActivityFeed.tsx` into its own dedicated file. `RegisterAgent.tsx` is now a proper standalone component.
- **feat:** Add `IdAvailabilityBadge` to the Register Agent form — debounced `useAgentExists` check shows "AVAILABLE" / "ID TAKEN" / "checking..." inline as user types the agent ID. Agent ID field also enforces lowercase + hyphens only.
- **feat:** Add wallet warning banner in `RegisterAgent` and `CreatePolicyForm` when Freighter is not connected.
- **feat:** Wire `PolicyManager` "DEPLOY POLICY ON STELLAR" button to Freighter + SDK via `policy.buildCreatePolicyTx()` + `submitSignedTx()`. Shows loading state and a success banner with explorer TX link on confirmation.
- **feat:** Wire `PolicyManager` "REVOKE" button with optimistic UI update and Freighter signing path (comment-documented for when real on-chain policy IDs replace mock data).
- **feat:** Wire `AgentExplorer` to live on-chain registry via new `useAgents` hook. Falls back silently to mock data when RPC is unavailable or no agents are registered. Shows `DEMO DATA` badge when using mock data, `LOADING...` indicator while fetching.
- **feat:** Replace hardcoded stats bar values in `App.tsx` with live `useAgentCount()` and `usePolicyCount()` hooks. Displays "–" while loading.
- **fix:** Correct Horizon SSE URL format in `useEventFeed` — use `cursor=now` and per-contract streams instead of invalid `contract_id[]` array syntax.
- **fix:** Fix XDR ScSymbol decoding in `useEventFeed.classifyTopics` — correctly strip the 8-byte XDR prefix (4-byte type + 4-byte length) before string matching.

### Contracts

- **test:** Add 8 `execute_payment` tests to `policy_test.rs` covering: success path with token transfer, accumulated `spent_today`, per-tx limit exceeded, daily limit exceeded, payment on revoked policy, wrong recipient with `allowed_recipient` restriction, zero amount, and `remaining_allowance` decreases after payment. Uses `register_stellar_asset_contract_v2` + `StellarAssetClient::mint` for real token transfer simulation.
- **test:** Expand `registry_test.rs` with 16 new tests covering: `agent_exists` (true/false), `get_agent` field correctness, zero-price agent, negative price rejection, empty capabilities rejection, `get_nonexistent_agent` panic, `agent_count` stability after deactivate, reputation clamping above 10000, Bayesian reputation convergence, reputation update on nonexistent agent, `deactivate` nonexistent, `update_agent` field changes, `update_agent` deactivation via `is_active` flag, `update_agent` negative price rejection.

### CI

- **ci:** Update `test-sdk.yml` — drop Node.js version matrix, run `bun test` directly. SDK test job now single-pass with bun.

### Docs

- **docs:** Update `README.md` roadmap — mark Freighter integration, SDK unit tests, `execute_payment` tests, live dashboard data, and stats bar as complete.
- **docs:** Add `CHANGELOG.md` (this file).

---

## Earlier history

See `git log` for full commit history prior to the unreleased sprint above.
