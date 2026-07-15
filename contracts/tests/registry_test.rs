#![cfg(test)]

use soroban_sdk::{testutils::Address as _, vec, Bytes, Env, String};

use crate::registry::{RegistryContract, RegistryContractClient, RegistryError};
use crate::types::DataKey;

fn create_test_env() -> Env {
    Env::default()
}

#[test]
fn test_register_agent_success() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let id = client.register(
        &String::from_str(&env, "test-agent-v1"),
        &String::from_str(&env, "Test Agent"),
        &String::from_str(&env, "A test AI agent for unit testing"),
        &vec![
            &env,
            String::from_str(&env, "text-generation"),
            String::from_str(&env, "summarization"),
        ],
        &1_000_000_i128, // 0.1 USDC in stroops
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
}

#[test]
fn test_register_duplicate_fails() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &String::from_str(&env, "agent-1"),
        &String::from_str(&env, "Agent One"),
        &String::from_str(&env, "First agent"),
        &vec![&env, String::from_str(&env, "text")],
        &100_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    // Second registration with same ID should panic
    let result = env.try_invoke_contract::<String, _>(
        &contract_id,
        &soroban_sdk::symbol_short!("register"),
        (
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
fn test_reputation_update() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &String::from_str(&env, "rep-test"),
        &String::from_str(&env, "Rep Test Agent"),
        &String::from_str(&env, "For reputation testing"),
        &vec![&env, String::from_str(&env, "testing")],
        &100_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    // Update with a perfect score
    client.update_reputation(&String::from_str(&env, "rep-test"), &10000_u32);

    let agent = client.get_agent(&String::from_str(&env, "rep-test"));
    assert_eq!(agent.total_calls, 1);
    // After 1 call: (5000 * 0 + 10000) / (0 + 1) = 10000
    assert_eq!(agent.reputation, 10000);

    // Update with a poor score (0)
    client.update_reputation(&String::from_str(&env, "rep-test"), &0_u32);
    let agent = client.get_agent(&String::from_str(&env, "rep-test"));
    assert_eq!(agent.total_calls, 2);
    // After 2 calls: (10000 * 1 + 0) / (1 + 1) = 5000
    assert_eq!(agent.reputation, 5000);
}

#[test]
fn test_agent_count() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    assert_eq!(client.agent_count(), 0);

    for i in 0..3u32 {
        let id_str = soroban_sdk::String::from_str(&env, &alloc::format!("agent-{}", i));
        client.register(
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
fn test_deactivate_agent() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, RegistryContract);
    let client = RegistryContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    client.register(
        &String::from_str(&env, "deact-test"),
        &String::from_str(&env, "Deactivate Test"),
        &String::from_str(&env, "Will be deactivated"),
        &vec![&env, String::from_str(&env, "test")],
        &100_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Bytes::new(&env),
    );

    client.deactivate(&String::from_str(&env, "deact-test"));

    let agent = client.get_agent(&String::from_str(&env, "deact-test"));
    assert!(!agent.is_active);
}
