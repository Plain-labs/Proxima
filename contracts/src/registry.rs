#![no_std]

use soroban_sdk::{
    contract, contractimpl, contractmeta, panic_with_error, symbol_short, Address, Bytes, Env,
    String, Vec,
};

use crate::types::{Agent, DataKey, ProximaEvent};

contractmeta!(
    key = "Description",
    val = "Proxima Agent Registry — on-chain registry for AI agents on Stellar"
);

/// Errors that the registry contract can return
#[derive(Debug, Clone, Copy, PartialEq)]
#[repr(u32)]
pub enum RegistryError {
    AgentNotFound = 1,
    AgentAlreadyExists = 2,
    NotOwner = 3,
    InvalidPrice = 4,
    EmptyCapabilities = 5,
    Unauthorized = 6,
}

impl soroban_sdk::TryFromVal<Env, soroban_sdk::Val> for RegistryError {
    type Error = soroban_sdk::ConversionError;
    fn try_from_val(_env: &Env, val: &soroban_sdk::Val) -> Result<Self, Self::Error> {
        let n: u32 = val.try_into()?;
        match n {
            1 => Ok(RegistryError::AgentNotFound),
            2 => Ok(RegistryError::AgentAlreadyExists),
            3 => Ok(RegistryError::NotOwner),
            4 => Ok(RegistryError::InvalidPrice),
            5 => Ok(RegistryError::EmptyCapabilities),
            6 => Ok(RegistryError::Unauthorized),
            _ => Err(soroban_sdk::ConversionError),
        }
    }
}

impl From<RegistryError> for soroban_sdk::Error {
    fn from(e: RegistryError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    /// Register a new AI agent in the Proxima registry.
    ///
    /// # Arguments
    /// * `id`              - Unique agent identifier string (e.g. "my-image-gen-v1")
    /// * `name`            - Human-readable display name
    /// * `description`     - Short description of the agent's capabilities
    /// * `capabilities`    - Vec of capability tags (e.g. ["image-generation"])
    /// * `price_per_call`  - Cost in stroops per API call
    /// * `payment_asset`   - Asset code for payment (e.g. "USDC")
    /// * `payment_issuer`  - Issuer address of the payment asset
    /// * `endpoint_url`    - Optional URL for agent endpoint / documentation
    ///
    /// Emits: `AgentRegistered(id)`
    pub fn register(
        env: Env,
        id: String,
        name: String,
        description: String,
        capabilities: Vec<String>,
        price_per_call: i128,
        payment_asset: String,
        payment_issuer: Address,
        endpoint_url: Bytes,
    ) -> String {
        let owner = env.current_contract_address();
        // In a real deployment, caller authentication would be:
        // let owner: Address = env.invoker();
        // owner.require_auth();

        // Validate
        if price_per_call < 0 {
            panic_with_error!(&env, RegistryError::InvalidPrice);
        }
        if capabilities.is_empty() {
            panic_with_error!(&env, RegistryError::EmptyCapabilities);
        }

        let key = DataKey::Agent(id.clone());

        // Ensure agent ID is unique
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, RegistryError::AgentAlreadyExists);
        }

        let agent = Agent {
            id: id.clone(),
            name,
            description,
            capabilities,
            price_per_call,
            payment_asset,
            payment_issuer,
            owner,
            reputation: 5000, // start at 50.00%
            total_calls: 0,
            is_active: true,
            registered_at: env.ledger().sequence(),
            endpoint_url,
        };

        // Persist with a 1-year TTL (approximately 6,307,200 ledgers at 5s each)
        env.storage().persistent().set(&key, &agent);
        env.storage()
            .persistent()
            .extend_ttl(&key, 6_307_200, 6_307_200);

        // Increment agent count
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::AgentCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::AgentCount, &(count + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("regist"), symbol_short!("agent")),
            id.clone(),
        );

        id
    }

    /// Retrieve a registered agent by ID.
    pub fn get_agent(env: Env, id: String) -> Agent {
        let key = DataKey::Agent(id);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, RegistryError::AgentNotFound))
    }

    /// Check whether an agent ID exists in the registry.
    pub fn agent_exists(env: Env, id: String) -> bool {
        env.storage().persistent().has(&DataKey::Agent(id))
    }

    /// Update agent metadata. Only the original registering owner can update.
    pub fn update_agent(
        env: Env,
        id: String,
        name: String,
        description: String,
        capabilities: Vec<String>,
        price_per_call: i128,
        is_active: bool,
        endpoint_url: Bytes,
    ) {
        let key = DataKey::Agent(id.clone());
        let mut agent: Agent = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, RegistryError::AgentNotFound));

        // Only the owner can update
        agent.owner.require_auth();

        if price_per_call < 0 {
            panic_with_error!(&env, RegistryError::InvalidPrice);
        }

        agent.name = name;
        agent.description = description;
        agent.capabilities = capabilities;
        agent.price_per_call = price_per_call;
        agent.is_active = is_active;
        agent.endpoint_url = endpoint_url;

        env.storage().persistent().set(&key, &agent);

        env.events()
            .publish((symbol_short!("update"), symbol_short!("agent")), id);
    }

    /// Update the reputation score of an agent after a completed interaction.
    /// Called by the SpendingPolicy contract after a successful payment.
    ///
    /// Uses Bayesian update:  new_score = (old_score * total_calls + rating) / (total_calls + 1)
    /// where `rating` is 0–10000 (representing 0.00%–100.00%)
    pub fn update_reputation(env: Env, id: String, rating: u32) {
        let key = DataKey::Agent(id.clone());
        let mut agent: Agent = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, RegistryError::AgentNotFound));

        // Clamp rating to valid range
        let clamped_rating = rating.min(10000);

        // Bayesian weighted average
        let new_rep = if agent.total_calls == 0 {
            clamped_rating
        } else {
            let weighted = (agent.reputation as u64 * agent.total_calls + clamped_rating as u64)
                / (agent.total_calls + 1);
            weighted as u32
        };

        agent.reputation = new_rep;
        agent.total_calls += 1;

        env.storage().persistent().set(&key, &agent);

        env.events().publish(
            (symbol_short!("repupd"), symbol_short!("agent")),
            (id, new_rep),
        );
    }

    /// Deactivate an agent. Only the owner can deactivate.
    pub fn deactivate(env: Env, id: String) {
        let key = DataKey::Agent(id.clone());
        let mut agent: Agent = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, RegistryError::AgentNotFound));

        agent.owner.require_auth();
        agent.is_active = false;

        env.storage().persistent().set(&key, &agent);

        env.events()
            .publish((symbol_short!("deact"), symbol_short!("agent")), id);
    }

    /// Return total number of registered agents.
    pub fn agent_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::AgentCount)
            .unwrap_or(0)
    }
}
