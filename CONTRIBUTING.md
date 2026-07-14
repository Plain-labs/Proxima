# Contributing to Proxima

Welcome! Proxima is a community-driven open-source project and we're actively looking for contributors across all skill levels. Whether you write Rust, TypeScript, React, or just good documentation — there's a place for you here.

---

## 🗺️ Where to Start

All open work lives in **GitHub Issues**. Every issue is labeled so you can find something that fits your skills:

| Label | Meaning |
|---|---|
| 🟢 `good-first-issue` | Well-scoped, fully explained, no prior context needed |
| 🟡 `help-wanted` | Needs an owner, clear requirements, moderate complexity |
| 🔵 `soroban` | Rust/Soroban smart contract work |
| 🟣 `sdk` | TypeScript SDK work |
| 🟠 `dashboard` | React/frontend work |
| 📖 `docs` | Documentation, guides, examples |
| 🧪 `testing` | Writing or improving tests |

**New to Stellar?** Start with a `good-first-issue` + `docs` or `sdk` — these have the most guidance and don't require deep Soroban knowledge.

---

## 🛠️ Project Structure

```
Proxima/
├── contracts/   Rust/Soroban smart contracts
├── sdk/         TypeScript SDK (@Proxima/sdk)
└── dashboard/   React explorer app
```

Each area has its own setup instructions below.

---

## ⚙️ Local Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Soroban CLI | latest | `cargo install --locked soroban-cli` |
| Stellar CLI | latest | `cargo install --locked stellar-cli` |

### Clone & Install

```bash
git clone https://github.com/IyanuOluwaJesuloba/Proxima
cd Proxima
npm install
```

### Smart Contracts (Rust)

```bash
cd contracts

# Add WASM target
rustup target add wasm32-unknown-unknown

# Build contracts
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test
```

### TypeScript SDK

```bash
cd sdk
npm install
npm run build
npm test
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🌐 Working with Stellar Testnet

1. **Get a testnet account:**
   ```bash
   stellar keys generate --global my-account --network testnet
   stellar keys address my-account
   ```

2. **Fund it via Friendbot:**
   ```
   https://friendbot.stellar.org?addr=<YOUR_ADDRESS>
   ```

3. **Deploy contracts to testnet:**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/Proxima_contracts.wasm \
     --source my-account \
     --network testnet
   ```

4. **Point the SDK at testnet** (already the default):
   ```ts
   const mind = new Proxima({ network: 'testnet' })
   ```

---

## 📋 Contribution Workflow

1. **Find an issue** — check the Issues tab, filtered by label
2. **Comment to claim it** — say "I'd like to work on this" so maintainers can assign it
3. **Fork the repo** and create a branch: `git checkout -b feat/your-feature`
4. **Write code + tests** — every PR needs tests for new functionality
5. **Open a PR** — reference the issue with `Closes #123`
6. **Review** — maintainers will review within 3 business days
7. **Merge** 🎉

---

## 📐 Code Standards

### Rust (contracts)
- Follow standard Rust formatting: `cargo fmt`
- Run clippy before submitting: `cargo clippy -- -D warnings`
- Every public function needs a doc comment (`///`)
- Every new contract function needs a matching test

### TypeScript (sdk + dashboard)
- Prettier for formatting (config in `package.json`)
- ESLint with the project config
- Prefer `async/await` over raw Promises
- Export types alongside implementations

### Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(sdk): add find() method with indexer support
fix(contracts): clamp reputation score to valid range
docs(contributing): add testnet setup section
test(registry): add deactivation edge case test
```

---

## 🐛 Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (OS, Node version, Rust version)

---

## 💡 Suggesting Features

Open an issue with the `enhancement` label. Describe:
- The problem you're solving
- Your proposed solution
- Any alternatives you considered

---

## 🏅 Recognition

All contributors are credited in our [CONTRIBUTORS.md](./CONTRIBUTORS.md) and release notes.

Active contributors may be invited to become project maintainers.

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Thank you for helping build the AI agent economy on Stellar. 🚀*
