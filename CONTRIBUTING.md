# Contributing to Proxima

Welcome! Proxima is a community-driven open-source project and we're actively
looking for contributors across all skill levels. Whether you write Rust,
TypeScript, React, or good documentation — there's a place for you here.

---

## Where to Start

All open work lives in **GitHub Issues**. Every issue is labeled so you can
find something that fits your skills:

| Label | Meaning |
|---|---|
| 🟢 `good-first-issue` | Well-scoped, fully explained, no prior Stellar knowledge needed |
| 🟡 `help-wanted` | Clear requirements, moderate complexity, needs an owner |
| 🔵 `soroban` | Rust / Soroban smart contract work |
| 🟣 `sdk` | TypeScript SDK (`@proxima/sdk`) |
| 🟠 `dashboard` | React / frontend work |
| 📖 `docs` | Documentation, guides, and examples |
| 🧪 `testing` | Writing or improving tests |

New to Stellar? Start with `good-first-issue` + `sdk` or `docs` — these have
the most guidance and don't require deep Soroban knowledge.

---

## Project Structure

```
Proxima/
├── contracts/      Soroban smart contracts (Rust)
│   ├── src/        Contract source code
│   └── tests/      Integration tests
├── sdk/            TypeScript SDK (@proxima/sdk)
│   ├── src/        SDK source code
│   └── examples/   Runnable usage examples
├── dashboard/      React explorer app
│   └── src/
│       ├── components/
│       ├── hooks/      React hooks wrapping the SDK
│       └── lib/        Shared utilities
└── docs/           Architecture, contract spec, SDK guide, deployment
```

---

## Local Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Bun | ≥ 1.0 | `npm install -g bun` |
| Rust | stable (≥ 1.75) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Stellar CLI | ≥ 21.x | `cargo install --locked stellar-cli --features opt` |

### Clone and install

```bash
git clone https://github.com/IyanuOluwaJesuloba/Proxima
cd Proxima
bun install
```

### Smart contracts

```bash
cd contracts

# Add WASM compile target
rustup target add wasm32-unknown-unknown

# Run tests
cargo test

# Build WASM
cargo build --target wasm32-unknown-unknown --release
```

### TypeScript SDK

```bash
cd sdk
bun install
bun run typecheck   # type-check only
bun run build       # compile to dist/
bun run test        # run tests
```

### Dashboard

```bash
cd dashboard
bun install
bun run dev         # starts at http://localhost:5173
```

---

## Working with Stellar Testnet

**1. Generate a testnet keypair:**
```bash
stellar keys generate --global my-account --network testnet
stellar keys address my-account
```

**2. Fund it via Friendbot:**
```
https://friendbot.stellar.org?addr=<YOUR_ADDRESS>
```

**3. Deploy the contracts:**
```bash
cd contracts
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proxima_contracts.wasm \
  --source my-account \
  --network testnet
```

Full deployment instructions are in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## Contribution Workflow

1. **Find an issue** — check the Issues tab, filtered by label
2. **Comment to claim it** — say "I'd like to work on this" so maintainers can assign it
3. **Fork** the repo and create a branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Write code + tests** — every PR needs tests for new functionality
5. **Verify locally:**
   ```bash
   # Contracts
   cd contracts && cargo test && cargo clippy -- -D warnings

   # SDK
   cd sdk && bun run typecheck && bun run test && bun run build

   # Dashboard
   cd dashboard && bunx tsc --noEmit && bun run build
   ```
6. **Open a PR** — reference the issue with `Closes #123`
7. **Review** — a maintainer will review within 3 business days
8. **Merge** 🎉

---

## Code Standards

### Rust (contracts)

- Format with `cargo fmt` before committing
- Run `cargo clippy -- -D warnings` — PRs must pass with zero warnings
- Every public function needs a doc comment (`///`)
- Every new contract function needs a corresponding test in `contracts/tests/`
- Follow the existing error enum pattern (`#[repr(u32)]`)

### TypeScript (sdk + dashboard)

- All new SDK methods must have JSDoc comments with an `@example` block
- Prefer `async/await` over raw Promise chains
- Export types alongside implementations — no `any` in public APIs
- Dashboard hooks must handle loading, error, and empty states

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(sdk): add policyCount method to PolicyClient
fix(contracts): clamp reputation rating to valid range
docs(sdk): add x402 integration example to SDK_GUIDE
test(policy): add recipient restriction test cases
refactor(dashboard): extract ReputationBar into shared component
ci: add path-filtered test-contracts workflow
```

Scopes: `contracts`, `sdk`, `dashboard`, `docs`, `ci`

---

## Testing Requirements

| Area | Requirement |
|---|---|
| New contract function | Matching test in `contracts/tests/` |
| New SDK method | Type-checks cleanly; example in JSDoc |
| Dashboard component | Renders without errors in `bun run build` |
| Bug fix | Regression test demonstrating the fix |

---

## Reporting Bugs

Use the [Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md) template.
Include: what you expected, what happened, steps to reproduce, and your
environment (OS, Node, Rust versions, network).

---

## Suggesting Features

Use the [Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md) template.
Describe the problem, your proposed solution, and any alternatives considered.

---

## Recognition

All contributors are credited in release notes and the project README.
Active contributors may be invited to become project maintainers.

---

## License

By contributing, you agree that your contributions will be licensed under
the [MIT License](./LICENSE).

---

*Thank you for helping build the AI agent economy on Stellar. 🚀*
