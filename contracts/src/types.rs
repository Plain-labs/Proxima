#![no_std]

use soroban_sdk::{contracttype, Address, Bytes, String, Vec};

/// Represents a registered AI agent in the Proxima registry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Agent {
    /// Unique identifier for this agent (e.g. "image-gen-v1")
    pub id: String,
    /// Human-readable display name
    pub name: String,
    /// Short description of what this agent does
    pub description: String,
    /// List of capability tags (e.g. ["image-generation", "text-to-speech"])
    pub capabilities: Vec<String>,
    /// Price per API call in stroops (1 XLM = 10_000_000 stroops)
    pub price_per_call: i128,
    /// Asset code for payment (e.g. "USDC")
    pub payment_asset: String,
    /// Payment asset issuer address
    pub payment_issuer: Address,
    /// The wallet address that owns/controls this agent
    pub owner: Address,
    /// Reputation score (0–10000, representing 0.00–100.00%)
    pub reputation: u32,
    /// Total number of completed calls (used for reputation weighting)
    pub total_calls: u64,
    /// Whether this agent is currently accepting new requests
    pub is_active: bool,
    /// Ledger sequence when this agent was registered
    pub registered_at: u32,
    /// Optional URL for more info / agent endpoint
    pub endpoint_url: Bytes,
}

/// A spending policy that allows an agent to make payments autonomously
/// within defined constraints — without per-transaction human approval.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SpendingPolicy {
    /// Unique policy ID
    pub id: u64,
    /// The address that created this policy (the "owner" / human)
    pub owner: Address,
    /// The agent address that is authorized to spend under this policy
    pub agent: Address,
    /// Maximum amount that can be spent in a single transaction (in stroops)
    pub max_per_tx: i128,
    /// Maximum amount that can be spent per day (in stroops)
    pub daily_limit: i128,
    /// Asset code (e.g. "USDC")
    pub asset: String,
    /// Asset issuer
    pub issuer: Address,
    /// Total amount spent in the current day window (resets daily)
    pub spent_today: i128,
    /// Ledger sequence of the last spend reset
    pub last_reset_ledger: u32,
    /// Cumulative total spent under this policy (all time)
    pub total_spent: i128,
    /// Whether this policy is currently active
    pub is_active: bool,
    /// Ledger sequence when this policy was created
    pub created_at: u32,
    /// Optional: restrict spending to a specific recipient agent ID
    pub allowed_recipient: Option<Address>,
}

/// A record of a payment made by an agent under a spending policy.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub policy_id: u64,
    pub agent: Address,
    pub recipient: Address,
    pub amount: i128,
    pub asset: String,
    pub memo: String,
    pub ledger: u32,
}

/// Events emitted by the contracts (for indexing and the dashboard feed)
#[contracttype]
pub enum ProximaEvent {
    AgentRegistered(String),        // agent_id
    AgentUpdated(String),           // agent_id
    AgentDeactivated(String),       // agent_id
    ReputationUpdated(String, u32), // agent_id, new_score
    PolicyCreated(u64),             // policy_id
    PolicyRevoked(u64),             // policy_id
    PaymentExecuted(u64, i128),     // policy_id, amount
}

/// Storage keys used by both contracts
#[contracttype]
pub enum DataKey {
    Agent(String),          // agent_id → Agent
    AgentCount,             // total registered agents
    Policy(u64),            // policy_id → SpendingPolicy
    PolicyCount,            // total created policies
    AgentPolicies(Address), // agent_address → Vec<u64> (policy IDs)
}
