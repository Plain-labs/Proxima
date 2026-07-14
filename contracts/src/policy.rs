#![no_std]

use soroban_sdk::{
    contract, contractimpl, contractmeta, panic_with_error,
    token, Address, Env, String, symbol_short,
};

use crate::types::{DataKey, PaymentRecord, SpendingPolicy};

contractmeta!(
    key = "Description",
    val = "Proxima Spending Policy — programmable autonomous payment authorization for AI agents"
);

/// Approximate number of ledgers in 24 hours (5s per ledger)
const LEDGERS_PER_DAY: u32 = 17_280;

#[derive(Debug, Clone, Copy, PartialEq)]
#[repr(u32)]
pub enum PolicyError {
    PolicyNotFound      = 1,
    NotOwner            = 2,
    PolicyInactive      = 3,
    ExceedsPerTxLimit   = 4,
    ExceedsDailyLimit   = 5,
    InvalidAmount       = 6,
    UnauthorizedAgent   = 7,
    RecipientNotAllowed = 8,
}

impl soroban_sdk::TryFromVal<Env, soroban_sdk::Val> for PolicyError {
    type Error = soroban_sdk::ConversionError;
    fn try_from_val(_env: &Env, val: &soroban_sdk::Val) -> Result<Self, Self::Error> {
        let n: u32 = val.try_into()?;
        match n {
            1 => Ok(PolicyError::PolicyNotFound),
            2 => Ok(PolicyError::NotOwner),
            3 => Ok(PolicyError::PolicyInactive),
            4 => Ok(PolicyError::ExceedsPerTxLimit),
            5 => Ok(PolicyError::ExceedsDailyLimit),
            6 => Ok(PolicyError::InvalidAmount),
            7 => Ok(PolicyError::UnauthorizedAgent),
            8 => Ok(PolicyError::RecipientNotAllowed),
            _ => Err(soroban_sdk::ConversionError),
        }
    }
}

impl From<PolicyError> for soroban_sdk::Error {
    fn from(e: PolicyError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

#[contract]
pub struct PolicyContract;

#[contractimpl]
impl PolicyContract {

    /// Create a new spending policy that authorizes an AI agent to make
    /// autonomous payments on behalf of the policy owner, within defined limits.
    ///
    /// # Arguments
    /// * `agent`              - Address of the agent being authorized
    /// * `max_per_tx`         - Maximum amount allowed per single transaction (stroops)
    /// * `daily_limit`        - Maximum total amount per day (stroops)
    /// * `asset`              - Asset code (e.g. "USDC")
    /// * `issuer`             - Asset issuer address
    /// * `allowed_recipient`  - Optional: restrict to a specific recipient
    ///
    /// Returns the new policy ID.
    pub fn create_policy(
        env: Env,
        agent: Address,
        max_per_tx: i128,
        daily_limit: i128,
        asset: String,
        issuer: Address,
        allowed_recipient: Option<Address>,
    ) -> u64 {
        let owner = env.current_contract_address();
        // Production: let owner: Address = env.invoker(); owner.require_auth();

        if max_per_tx <= 0 || daily_limit <= 0 {
            panic_with_error!(&env, PolicyError::InvalidAmount);
        }

        // Increment policy counter
        let policy_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PolicyCount)
            .unwrap_or(0_u64)
            + 1;

        let policy = SpendingPolicy {
            id: policy_id,
            owner,
            agent: agent.clone(),
            max_per_tx,
            daily_limit,
            asset,
            issuer,
            spent_today: 0,
            last_reset_ledger: env.ledger().sequence(),
            total_spent: 0,
            is_active: true,
            created_at: env.ledger().sequence(),
            allowed_recipient,
        };

        let key = DataKey::Policy(policy_id);
        env.storage().persistent().set(&key, &policy);
        env.storage().persistent().extend_ttl(&key, 6_307_200, 6_307_200);
        env.storage().instance().set(&DataKey::PolicyCount, &policy_id);

        env.events().publish(
            (symbol_short!("policy"), symbol_short!("create")),
            policy_id,
        );

        policy_id
    }

    /// Execute an autonomous payment under a spending policy.
    ///
    /// This is the core function — it allows an authorized agent to pay
    /// a recipient WITHOUT requiring the owner to sign each transaction.
    /// The policy contract enforces all constraints on-chain.
    ///
    /// # Arguments
    /// * `policy_id`  - ID of the spending policy
    /// * `recipient`  - Address receiving the payment
    /// * `amount`     - Amount in stroops
    /// * `memo`       - Short description of the payment purpose
    ///
    /// Emits: `PaymentExecuted(policy_id, amount)`
    pub fn execute_payment(
        env: Env,
        policy_id: u64,
        recipient: Address,
        amount: i128,
        memo: String,
    ) -> PaymentRecord {
        let key = DataKey::Policy(policy_id);
        let mut policy: SpendingPolicy = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, PolicyError::PolicyNotFound));

        // Only the authorized agent can call this
        policy.agent.require_auth();

        if !policy.is_active {
            panic_with_error!(&env, PolicyError::PolicyInactive);
        }

        if amount <= 0 {
            panic_with_error!(&env, PolicyError::InvalidAmount);
        }

        // Per-transaction limit check
        if amount > policy.max_per_tx {
            panic_with_error!(&env, PolicyError::ExceedsPerTxLimit);
        }

        // Optional recipient restriction
        if let Some(ref allowed) = policy.allowed_recipient {
            if *allowed != recipient {
                panic_with_error!(&env, PolicyError::RecipientNotAllowed);
            }
        }

        // Reset daily counter if 24h have passed
        let current_ledger = env.ledger().sequence();
        let ledgers_since_reset = current_ledger.saturating_sub(policy.last_reset_ledger);
        if ledgers_since_reset >= LEDGERS_PER_DAY {
            policy.spent_today = 0;
            policy.last_reset_ledger = current_ledger;
        }

        // Daily limit check
        if policy.spent_today + amount > policy.daily_limit {
            panic_with_error!(&env, PolicyError::ExceedsDailyLimit);
        }

        // Execute the actual token transfer via Stellar token interface
        let token_client = token::Client::new(&env, &policy.issuer);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Update policy state
        policy.spent_today += amount;
        policy.total_spent += amount;
        env.storage().persistent().set(&key, &policy);

        let record = PaymentRecord {
            policy_id,
            agent: policy.agent.clone(),
            recipient: recipient.clone(),
            amount,
            asset: policy.asset.clone(),
            memo,
            ledger: current_ledger,
        };

        env.events().publish(
            (symbol_short!("pay"), symbol_short!("exec")),
            (policy_id, amount),
        );

        record
    }

    /// Revoke a spending policy. Only the owner can revoke.
    pub fn revoke_policy(env: Env, policy_id: u64) {
        let key = DataKey::Policy(policy_id);
        let mut policy: SpendingPolicy = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, PolicyError::PolicyNotFound));

        policy.owner.require_auth();
        policy.is_active = false;

        env.storage().persistent().set(&key, &policy);

        env.events().publish(
            (symbol_short!("policy"), symbol_short!("revoke")),
            policy_id,
        );
    }

    /// Get a spending policy by ID.
    pub fn get_policy(env: Env, policy_id: u64) -> SpendingPolicy {
        env.storage()
            .persistent()
            .get(&DataKey::Policy(policy_id))
            .unwrap_or_else(|| panic_with_error!(&env, PolicyError::PolicyNotFound))
    }

    /// Check if an agent is authorized under a given policy.
    pub fn is_authorized(env: Env, policy_id: u64, agent: Address) -> bool {
        if let Some(policy) = env
            .storage()
            .persistent()
            .get::<DataKey, SpendingPolicy>(&DataKey::Policy(policy_id))
        {
            policy.is_active && policy.agent == agent
        } else {
            false
        }
    }

    /// Return remaining daily spending allowance for a policy.
    pub fn remaining_allowance(env: Env, policy_id: u64) -> i128 {
        let policy: SpendingPolicy = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(policy_id))
            .unwrap_or_else(|| panic_with_error!(&env, PolicyError::PolicyNotFound));

        let current_ledger = env.ledger().sequence();
        let ledgers_since_reset = current_ledger.saturating_sub(policy.last_reset_ledger);

        if ledgers_since_reset >= LEDGERS_PER_DAY {
            policy.daily_limit // full reset
        } else {
            policy.daily_limit - policy.spent_today
        }
    }

    /// Return total number of policies created.
    pub fn policy_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::PolicyCount).unwrap_or(0)
    }
}
