#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    vec, Env, String,
};

use crate::policy::{PolicyContract, PolicyContractClient};

fn create_test_env() -> Env {
    Env::default()
}

#[test]
fn test_create_policy_success() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &5_000_000_i128,        // 0.50 USDC max per tx
        &100_000_000_i128,      // 10.00 USDC daily limit
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert_eq!(policy_id, 1);

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.agent, agent);
    assert_eq!(policy.max_per_tx, 5_000_000);
    assert_eq!(policy.daily_limit, 100_000_000);
    assert!(policy.is_active);
    assert_eq!(policy.spent_today, 0);
    assert_eq!(policy.total_spent, 0);
}

#[test]
fn test_create_policy_invalid_amount_fails() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    // Zero max_per_tx should fail
    let result = env.try_invoke_contract::<u64, _>(
        &contract_id,
        &soroban_sdk::symbol_short!("create_policy"),
        (
            agent.clone(),
            0_i128,
            100_000_000_i128,
            String::from_str(&env, "USDC"),
            issuer.clone(),
            soroban_sdk::Val::VOID,
        ).into_val(&env),
    );
    assert!(result.is_err());

    // Zero daily_limit should fail
    let result2 = env.try_invoke_contract::<u64, _>(
        &contract_id,
        &soroban_sdk::symbol_short!("create_policy"),
        (
            agent,
            5_000_000_i128,
            0_i128,
            String::from_str(&env, "USDC"),
            issuer,
            soroban_sdk::Val::VOID,
        ).into_val(&env),
    );
    assert!(result2.is_err());
}

#[test]
fn test_policy_count_increments() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    assert_eq!(client.policy_count(), 0);

    for _ in 0..3 {
        let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
        client.create_policy(
            &agent,
            &1_000_000_i128,
            &10_000_000_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &None,
        );
    }

    assert_eq!(client.policy_count(), 3);
}

#[test]
fn test_revoke_policy() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &5_000_000_i128,
        &100_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    let policy = client.get_policy(&policy_id);
    assert!(policy.is_active);

    client.revoke_policy(&policy_id);

    let revoked = client.get_policy(&policy_id);
    assert!(!revoked.is_active);
}

#[test]
fn test_is_authorized() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let other = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &5_000_000_i128,
        &100_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert!(client.is_authorized(&policy_id, &agent));
    assert!(!client.is_authorized(&policy_id, &other));
}

#[test]
fn test_remaining_allowance_full_on_fresh_policy() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &5_000_000_i128,
        &100_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    // Fresh policy: remaining allowance should equal the full daily limit
    let remaining = client.remaining_allowance(&policy_id);
    assert_eq!(remaining, 100_000_000);
}

#[test]
fn test_policy_not_found_panics() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let result = env.try_invoke_contract::<crate::types::SpendingPolicy, _>(
        &contract_id,
        &soroban_sdk::symbol_short!("get_policy"),
        (999_u64,).into_val(&env),
    );

    assert!(result.is_err());
}

#[test]
fn test_allowed_recipient_restriction() {
    let env = create_test_env();
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);

    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let allowed = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &5_000_000_i128,
        &100_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Some(allowed.clone()),
    );

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.allowed_recipient, Some(allowed));
}
