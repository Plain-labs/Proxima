#![cfg(test)]

use soroban_sdk::{token, Env, String};

use proxima_contracts::policy::{PolicyContract, PolicyContractClient};

fn create_test_env() -> Env {
    Env::default()
}

/// Helper: deploy the policy contract and return its client + a mock USDC issuer
fn setup(env: &Env) -> (PolicyContractClient<'_>, soroban_sdk::Address) {
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(env, &contract_id);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);
    (client, issuer)
}

/// Helper: mint `amount` of `asset` to `to` using the Stellar token contract.
fn mint_token(
    env: &Env,
    issuer: &soroban_sdk::Address,
    to: &soroban_sdk::Address,
    amount: i128,
) -> soroban_sdk::Address {
    let token_contract_id = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_admin = token::StellarAssetClient::new(env, &token_contract_id.address());
    token_admin.mint(to, &amount);
    token_contract_id.address()
}

// ─── create_policy ───────────────────────────────────────────────────────────

#[test]
fn test_create_policy_success() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &500_000_i128,    // 0.05 USDC max per tx
        &10_000_000_i128, // 1.00 USDC daily limit
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert_eq!(policy_id, 1);

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.agent, agent);
    assert_eq!(policy.max_per_tx, 500_000);
    assert_eq!(policy.daily_limit, 10_000_000);
    assert_eq!(policy.spent_today, 0);
    assert_eq!(policy.total_spent, 0);
    assert!(policy.is_active);
    assert!(policy.allowed_recipient.is_none());
}

#[test]
fn test_create_policy_with_allowed_recipient() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let recipient = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &Some(recipient.clone()),
    );

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.allowed_recipient, Some(recipient));
}

#[test]
fn test_create_policy_invalid_amount_panics() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    // max_per_tx = 0 should fail
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.create_policy(
            &agent,
            &0_i128,
            &1_000_000_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &None,
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_policy_counter_increments() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);

    for _ in 0..5 {
        let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
        client.create_policy(
            &agent,
            &100_000_i128,
            &1_000_000_i128,
            &String::from_str(&env, "USDC"),
            &issuer,
            &None,
        );
    }

    assert_eq!(client.policy_count(), 5);
}

// ─── is_authorized ────────────────────────────────────────────────────────────

#[test]
fn test_is_authorized_returns_true_for_active_policy() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert!(client.is_authorized(&policy_id, &agent));
}

#[test]
fn test_is_authorized_returns_false_for_wrong_agent() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let other = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert!(!client.is_authorized(&policy_id, &other));
}

#[test]
fn test_is_authorized_returns_false_for_nonexistent_policy() {
    let env = create_test_env();
    let (client, _) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    assert!(!client.is_authorized(&999, &agent));
}

// ─── revoke_policy ────────────────────────────────────────────────────────────

#[test]
fn test_revoke_policy_sets_inactive() {
    let env = create_test_env();
    env.mock_all_auths();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert!(client.get_policy(&policy_id).is_active);

    client.revoke_policy(&policy_id);

    assert!(!client.get_policy(&policy_id).is_active);
    assert!(!client.is_authorized(&policy_id, &agent));
}

#[test]
fn test_revoke_nonexistent_policy_panics() {
    let env = create_test_env();
    let (client, _) = setup(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.revoke_policy(&9999);
    }));
    assert!(result.is_err());
}

// ─── remaining_allowance ─────────────────────────────────────────────────────

#[test]
fn test_remaining_allowance_starts_at_daily_limit() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &5_000_000_i128, // 0.50 USDC daily
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    // Nothing spent yet — full daily limit should be remaining
    let remaining = client.remaining_allowance(&policy_id);
    assert_eq!(remaining, 5_000_000);
}

// ─── get_policy ───────────────────────────────────────────────────────────────

#[test]
fn test_get_nonexistent_policy_panics() {
    let env = create_test_env();
    let (client, _) = setup(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.get_policy(&9999);
    }));
    assert!(result.is_err());
}

#[test]
fn test_policy_stores_correct_asset_and_issuer() {
    let env = create_test_env();
    let (client, issuer) = setup(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let policy_id = client.create_policy(
        &agent,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.asset, String::from_str(&env, "USDC"));
    assert_eq!(policy.issuer, issuer);
}

#[test]
fn test_multiple_policies_independent() {
    let env = create_test_env();
    env.mock_all_auths();
    let (client, issuer) = setup(&env);

    let agent_a = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let agent_b = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let id_a = client.create_policy(
        &agent_a,
        &100_000_i128,
        &1_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    let id_b = client.create_policy(
        &agent_b,
        &200_000_i128,
        &2_000_000_i128,
        &String::from_str(&env, "USDC"),
        &issuer,
        &None,
    );

    assert_ne!(id_a, id_b);

    let policy_a = client.get_policy(&id_a);
    let policy_b = client.get_policy(&id_b);

    assert_eq!(policy_a.agent, agent_a);
    assert_eq!(policy_b.agent, agent_b);
    assert_eq!(policy_a.max_per_tx, 100_000);
    assert_eq!(policy_b.max_per_tx, 200_000);

    // Revoking A should not affect B
    client.revoke_policy(&id_a);
    assert!(!client.get_policy(&id_a).is_active);
    assert!(client.get_policy(&id_b).is_active);
}

// ─── execute_payment ─────────────────────────────────────────────────────────

/// Helper: set up a policy contract + a funded token account ready to
/// call execute_payment.  Returns (client, policy_id, agent, recipient).
fn setup_payment_env(
    env: &Env,
) -> (
    PolicyContractClient<'_>,
    u64,
    soroban_sdk::Address,
    soroban_sdk::Address,
    soroban_sdk::Address, // token_id
) {
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(env, &contract_id);

    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);
    let recipient = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(env);

    // Create a Stellar asset and mint 10 USDC (100_000_000 stroops) to the
    // policy contract so it can fund transfers.
    let token_id = mint_token(env, &issuer, &contract_id, 100_000_000);

    let policy_id = client.create_policy(
        &agent,
        &500_000_i128,    // 0.05 USDC max per tx
        &10_000_000_i128, // 1.00 USDC daily limit
        &String::from_str(env, "USDC"),
        &token_id, // use the registered token address as issuer
        &None,
    );

    (client, policy_id, agent, recipient, token_id)
}

#[test]
fn test_execute_payment_success() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, agent, recipient, token_id) = setup_payment_env(&env);

    let payment_amount = 100_000_i128; // 0.01 USDC

    let record = client.execute_payment(
        &policy_id,
        &recipient,
        &payment_amount,
        &String::from_str(&env, "API call #1"),
    );

    // Return value correct
    assert_eq!(record.policy_id, policy_id);
    assert_eq!(record.agent, agent);
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.amount, payment_amount);

    // Policy state updated
    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.spent_today, payment_amount);
    assert_eq!(policy.total_spent, payment_amount);

    // Recipient balance increased
    let token = token::Client::new(&env, &token_id);
    assert_eq!(token.balance(&recipient), payment_amount);
}

#[test]
fn test_execute_payment_accumulates_spent_today() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    // Make three payments
    for _ in 0..3 {
        client.execute_payment(
            &policy_id,
            &recipient,
            &100_000_i128,
            &String::from_str(&env, "test"),
        );
    }

    let policy = client.get_policy(&policy_id);
    assert_eq!(policy.spent_today, 300_000);
    assert_eq!(policy.total_spent, 300_000);
}

#[test]
fn test_execute_payment_exceeds_per_tx_limit_panics() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    // max_per_tx is 500_000; try 600_000
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.execute_payment(
            &policy_id,
            &recipient,
            &600_000_i128,
            &String::from_str(&env, "too much"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_execute_payment_exceeds_daily_limit_panics() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    // daily_limit is 10_000_000; make 20 payments of 500_000 = 10_000_000 exactly
    for _ in 0..20 {
        client.execute_payment(
            &policy_id,
            &recipient,
            &500_000_i128,
            &String::from_str(&env, "batch"),
        );
    }

    // 21st payment should fail
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.execute_payment(
            &policy_id,
            &recipient,
            &500_000_i128,
            &String::from_str(&env, "over limit"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_execute_payment_on_revoked_policy_panics() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    client.revoke_policy(&policy_id);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.execute_payment(
            &policy_id,
            &recipient,
            &100_000_i128,
            &String::from_str(&env, "revoked"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_execute_payment_wrong_recipient_panics() {
    let env = create_test_env();
    env.mock_all_auths();

    // Create a policy with an allowed_recipient restriction
    let contract_id = env.register_contract(None, PolicyContract);
    let client = PolicyContractClient::new(&env, &contract_id);
    let issuer = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let agent = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let allowed = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);
    let wrong = <soroban_sdk::Address as soroban_sdk::testutils::Address>::generate(&env);

    let token_id = mint_token(&env, &issuer, &contract_id, 100_000_000);

    let policy_id = client.create_policy(
        &agent,
        &500_000_i128,
        &10_000_000_i128,
        &String::from_str(&env, "USDC"),
        &token_id,
        &Some(allowed),
    );

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.execute_payment(
            &policy_id,
            &wrong,
            &100_000_i128,
            &String::from_str(&env, "wrong recipient"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_execute_payment_zero_amount_panics() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.execute_payment(
            &policy_id,
            &recipient,
            &0_i128,
            &String::from_str(&env, "zero"),
        );
    }));
    assert!(result.is_err());
}

#[test]
fn test_remaining_allowance_decreases_after_payment() {
    let env = create_test_env();
    env.mock_all_auths();

    let (client, policy_id, _agent, recipient, _token_id) = setup_payment_env(&env);

    let before = client.remaining_allowance(&policy_id);
    assert_eq!(before, 10_000_000);

    client.execute_payment(
        &policy_id,
        &recipient,
        &500_000_i128, // within max_per_tx limit
        &String::from_str(&env, "pay"),
    );

    let after = client.remaining_allowance(&policy_id);
    assert_eq!(after, 9_500_000);
}
