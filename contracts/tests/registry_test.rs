#![cfg(test)]

use soroban_sdk::{vec, Bytes, Env, IntoVal, String};

use proxima_contracts::registry::{RegistryContract, RegistryContractClient};

fn create_test_env() -> Env {
    Env::default()
}

/// Convenience: register a minimal valid agent. Returns (owner, issuer, id_str).
fn register_agent(
    env: &Env,
    client: &RegistryContractClient,
    id: &str,
) -> (soroban_sdk::Address, soroban_sdk::Address, String) {
    env.mock_all_auths();
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);
    let id_str = String::from_str(env, id);
    client.register(
        &owner,
        &id_str,
        &String::from_str(env, "Test Agent"),
        &String::from_str(env, "A test agent"),
        &vec![env, String::from_str(env, "text-generation")],
        &1_000_000_i128,
        &String::from_str(env, "USDC"),
        &issuer,
        &Bytes::new(env),
    );
    (owner, issuer, id_str)
}

// ─── register ────────────────────────────────────────────────────────────────

#[test]
fn test_register_agent_success() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let id = client.register(
        &owner,
        &String::from_str(&env, "test-agent-v1"),
        &String::from_str(&env, "Test Agent"),
        &String::from_str(&env, "A test AI agent for unit testing"),
        &vec![
            &env,
            String::from_str(&env, "text-generation"),
            String::from_str(&env, "summarization"),
        ],
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    assert_eq!(id, String::from_str(&env, "test-agent-v1"));

    let agent = client.get_agent(&String::from_str(&env, "test-agent-v1"));
    assert_eq!(agent.name, String::from_str(&env, "Test Agent"));
    assert_eq!(agent.reputation, 5000); // starts at 50%
    assert_eq!(agent.total_calls, 0);
    assert!(agent.is_active);
    assert_eq!(agent.owner, owner);
}

#[test]
fn test_register_duplicate_fails() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &owner,
        &String::from_str(&env, "agent-1"),
        &String::from_str(&env, "Agent One"),
        &String::from_str(&env, "First agent"),
        &vec![&env, String::from_str(&env, "text")],
        &100_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    // Second registration with same ID should fail
    let result = env.try_invoke_contract::<String, soroban_sdk::Error>(
        &contract_id,
        &soroban_sdk::symbol_short!("register"),
        (
            owner,
            String::from_str(&env, "agent-1"),
            String::from_str(&env, "Agent Two"),
            String::from_str(&env, "Second agent"),
            vec![&env, String::from_str(&env, "text")],
            100_i128,
            String::from_str(&env, "USDC"),
            issuer,
            Bytes::new(&env),
        )
            .into_val(&env),
    );

    assert!(result.is_err());
}

#[test]
fn test_register_invalid_price_panics() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register(
            &owner,
            &String::from_str(&env, "neg-price-agent"),
            &String::from_str(&env, "Bad Agent"),
            &String::from_str(&env, "Negative price"),
            &vec![&env, String::from_str(&env, "test")],
            &-1_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &Bytes::new(&env),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_register_empty_capabilities_panics() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register(
            &owner,
            &String::from_str(&env, "no-caps"),
            &String::from_str(&env, "No Caps Agent"),
            &String::from_str(&env, "Missing capabilities"),
            &vec![&env], // empty
            &100_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &Bytes::new(&env),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_register_zero_price_is_valid() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let id = client.register(
        &owner,
        &String::from_str(&env, "free-agent"),
        &String::from_str(&env, "Free Agent"),
        &String::from_str(&env, "Free to use"),
        &vec![&env, String::from_str(&env, "text-generation")],
        &0_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );
    assert_eq!(id, String::from_str(&env, "free-agent"));
}

// ─── Authorization ────────────────────────────────────────────────────────────

#[test]
fn test_register_requires_caller_auth() {
    // Without mock_all_auths, owner.require_auth() should panic.
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register(
            &owner,
            &String::from_str(&env, "auth-test"),
            &String::from_str(&env, "Auth Test Agent"),
            &String::from_str(&env, "Tests that caller must authorize"),
            &vec![&env, String::from_str(&env, "test")],
            &100_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &Bytes::new(&env),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_update_agent_stores_owner_on_register() {
    // Verify the passed owner address is stored on the agent.
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let owner_a = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &owner_a,
        &String::from_str(&env, "owner-test"),
        &String::from_str(&env, "Test Agent"),
        &String::from_str(&env, "A test agent"),
        &vec![&env, String::from_str(&env, "text-generation")],
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    let agent = client.get_agent(&String::from_str(&env, "owner-test"));
    assert_eq!(agent.owner, owner_a);

    // The stored owner should be able to update the agent
    client.update_agent(
        &String::from_str(&env, "owner-test"),
        &String::from_str(&env, "Updated by Owner"),
        &String::from_str(&env, "desc"),
        &vec![&env, String::from_str(&env, "text-generation")],
        &1_000_000_i128,
        &true,
        &Bytes::new(&env),
    );
    let updated = client.get_agent(&String::from_str(&env, "owner-test"));
    assert_eq!(updated.name, String::from_str(&env, "Updated by Owner"));
}

// ─── agent_exists ─────────────────────────────────────────────────────────────

#[test]
fn test_agent_exists_returns_true_after_register() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "exists-test");

    assert!(client.agent_exists(&String::from_str(&env, "exists-test")));
}

#[test]
fn test_agent_exists_returns_false_for_unknown_id() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    assert!(!client.agent_exists(&String::from_str(&env, "ghost-agent")));
}

// ─── get_agent ────────────────────────────────────────────────────────────────

#[test]
fn test_get_nonexistent_agent_panics() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.get_agent(&String::from_str(&env, "no-such-agent"));
    }));
    assert!(result.is_err());
}

#[test]
fn test_get_agent_returns_correct_fields() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &owner,
        &String::from_str(&env, "field-test"),
        &String::from_str(&env, "Field Test Agent"),
        &String::from_str(&env, "Testing field storage"),
        &vec![
            &env,
            String::from_str(&env, "image-gen"),
            String::from_str(&env, "upscale"),
        ],
        &500_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    let agent = client.get_agent(&String::from_str(&env, "field-test"));
    assert_eq!(agent.id, String::from_str(&env, "field-test"));
    assert_eq!(agent.name, String::from_str(&env, "Field Test Agent"));
    assert_eq!(agent.price_per_call, 500_000);
    assert_eq!(agent.payment_asset, String::from_str(&env, "USDC"));
    assert_eq!(agent.payment_issuer, issuer);
    assert_eq!(agent.owner, owner);
    assert_eq!(agent.capabilities.len(), 2);
}

// ─── agent_count ─────────────────────────────────────────────────────────────

#[test]
fn test_agent_count() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    assert_eq!(client.agent_count(), 0);

    for i in 0..3u32 {
        let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
        let id_str = soroban_sdk::String::from_str(&env, &format!("agent-{}", i));
        client.register(
            &owner,
            &id_str,
            &String::from_str(&env, "Agent"),
            &String::from_str(&env, "Desc"),
            &vec![&env, String::from_str(&env, "test")],
            &100_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &Bytes::new(&env),
        );
    }

    assert_eq!(client.agent_count(), 3);
}

#[test]
fn test_agent_count_does_not_change_on_deactivate() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "count-test");
    assert_eq!(client.agent_count(), 1);

    client.deactivate(&String::from_str(&env, "count-test"));
    // Count reflects all-time registrations, not active-only
    assert_eq!(client.agent_count(), 1);
}

// ─── update_reputation ───────────────────────────────────────────────────────

#[test]
fn test_reputation_update() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);
    let owner = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &owner,
        &String::from_str(&env, "rep-test"),
        &String::from_str(&env, "Rep Test Agent"),
        &String::from_str(&env, "For reputation testing"),
        &vec![&env, String::from_str(&env, "testing")],
        &100_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    // Perfect score on first call — Bayesian: (5000*0 + 10000) / 1 = 10000
    client.update_reputation(&String::from_str(&env, "rep-test"), &10000_u32);
    let agent = client.get_agent(&String::from_str(&env, "rep-test"));
    assert_eq!(agent.total_calls, 1);
    assert_eq!(agent.reputation, 10000);

    // Zero score on second call — Bayesian: (10000*1 + 0) / 2 = 5000
    client.update_reputation(&String::from_str(&env, "rep-test"), &0_u32);
    let agent = client.get_agent(&String::from_str(&env, "rep-test"));
    assert_eq!(agent.total_calls, 2);
    assert_eq!(agent.reputation, 5000);
}

#[test]
fn test_reputation_clamps_above_10000() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "clamp-test");

    client.update_reputation(&String::from_str(&env, "clamp-test"), &99999_u32);
    let agent = client.get_agent(&String::from_str(&env, "clamp-test"));
    assert!(agent.reputation <= 10000);
}

#[test]
fn test_reputation_bayesian_average_converges() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "bayesian-test");

    for _ in 0..10 {
        client.update_reputation(&String::from_str(&env, "bayesian-test"), &10000_u32);
    }
    let agent = client.get_agent(&String::from_str(&env, "bayesian-test"));
    assert_eq!(agent.total_calls, 10);
    assert!(agent.reputation > 9000);
}

#[test]
fn test_reputation_update_nonexistent_agent_panics() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_reputation(&String::from_str(&env, "ghost"), &5000_u32);
    }));
    assert!(result.is_err());
}

// ─── deactivate ───────────────────────────────────────────────────────────────

#[test]
fn test_deactivate_agent() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "deact-test");

    client.deactivate(&String::from_str(&env, "deact-test"));

    let agent = client.get_agent(&String::from_str(&env, "deact-test"));
    assert!(!agent.is_active);
}

#[test]
fn test_deactivate_nonexistent_agent_panics() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.deactivate(&String::from_str(&env, "ghost-agent"));
    }));
    assert!(result.is_err());
}

// ─── update_agent ─────────────────────────────────────────────────────────────

#[test]
fn test_update_agent_changes_fields() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "update-test");

    client.update_agent(
        &String::from_str(&env, "update-test"),
        &String::from_str(&env, "Updated Name"),
        &String::from_str(&env, "Updated description"),
        &vec![&env, String::from_str(&env, "new-capability")],
        &2_000_000_i128,
        &true,
        &Bytes::new(&env),
    );

    let agent = client.get_agent(&String::from_str(&env, "update-test"));
    assert_eq!(agent.name, String::from_str(&env, "Updated Name"));
    assert_eq!(agent.price_per_call, 2_000_000);
    assert_eq!(agent.capabilities.len(), 1);
}

#[test]
fn test_update_agent_can_deactivate_via_is_active_flag() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "toggle-test");

    assert!(client.get_agent(&String::from_str(&env, "toggle-test")).is_active);

    client.update_agent(
        &String::from_str(&env, "toggle-test"),
        &String::from_str(&env, "Toggle Agent"),
        &String::from_str(&env, "desc"),
        &vec![&env, String::from_str(&env, "test")],
        &100_i128,
        &false,
        &Bytes::new(&env),
    );

    assert!(!client.get_agent(&String::from_str(&env, "toggle-test")).is_active);
}

#[test]
fn test_update_agent_negative_price_panics() {
    let env = create_test_env();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    register_agent(&env, &client, "bad-update");

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.update_agent(
            &String::from_str(&env, "bad-update"),
            &String::from_str(&env, "Name"),
            &String::from_str(&env, "desc"),
            &vec![&env, String::from_str(&env, "test")],
            &-500_i128,
            &true,
            &Bytes::new(&env),
        );
    }));
    assert!(result.is_err());
}
