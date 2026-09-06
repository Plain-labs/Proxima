/**
 * autonomous-payment.ts
 *
 * Example: Full autonomous payment flow using Proxima's SpendingPolicy.
 *
 * This demo shows the core Proxima use-case:
 *   1. Owner creates a spending policy, authorising an AI agent to pay autonomously
 *   2. The AI agent executes a payment WITHOUT requiring the owner to sign
 *   3. Both the per-tx cap and daily cap are enforced on-chain by the Soroban contract
 *
 * This is the pattern that makes x402-style agentic commerce possible on Stellar.
 *
 * Usage:
 *   OWNER_SECRET=S... AGENT_SECRET=S... npx ts-node examples/autonomous-payment.ts
 */

import { Keypair } from '@stellar/stellar-sdk';
import {
  Proxima,
  USDC_ISSUER,
  fromStroops,
  toStroops,
  ProximaError,
  ErrorCodes,
} from '../src/index';

async function main() {
  // ── 1. Load keypairs ───────────────────────────────────────────────────────

  const ownerSecret = process.env['OWNER_SECRET'];
  const agentSecret = process.env['AGENT_SECRET'];

  if (!ownerSecret || !agentSecret) {
    console.error('Both OWNER_SECRET and AGENT_SECRET env variables are required.');
    console.error('Both accounts must be funded on Stellar testnet.');
    process.exit(1);
  }

  const ownerKeypair = Keypair.fromSecret(ownerSecret);
  const agentKeypair = Keypair.fromSecret(agentSecret);
  const recipientKeypair = Keypair.random(); // simulate a service being paid

  console.log('\n─── Proxima Autonomous Payment Demo ─────────────────');
  console.log(`Owner:     ${ownerKeypair.publicKey()}`);
  console.log(`Agent:     ${agentKeypair.publicKey()}`);
  console.log(`Recipient: ${recipientKeypair.publicKey()}`);
  console.log('─────────────────────────────────────────────────────\n');

  const proxima = new Proxima({ network: 'testnet' });

  // ── 2. Owner creates a spending policy ────────────────────────────────────
  //
  //    Owner says: "I authorise this agent to spend up to 0.50 USDC per
  //    transaction and up to 10 USDC total per day, paid in USDC."
  //
  //    Once created, the owner does NOT need to be online for payments.

  console.log('Step 1: Owner creates a spending policy...');

  const policyId = await proxima.policy.create(
    {
      agent: agentKeypair.publicKey(),
      maxPerTx: '0.50',                         // max 0.50 USDC per call
      dailyLimit: '10.00',                       // max 10.00 USDC per day
      asset: 'USDC',
      issuer: USDC_ISSUER.testnet,
      // allowedRecipient: recipientKeypair.publicKey(), // optional restriction
    },
    ownerKeypair   // ← owner signs this one transaction to set up the policy
  );

  console.log(`✅ Policy created! ID: ${policyId}\n`);

  // ── 3. Verify the policy ──────────────────────────────────────────────────

  const policy = await proxima.policy.getPolicy(policyId);
  console.log('Policy details:');
  console.log(`  Agent authorized: ${policy.agent}`);
  console.log(`  Max per tx:       ${fromStroops(policy.maxPerTx)} ${policy.asset}`);
  console.log(`  Daily limit:      ${fromStroops(policy.dailyLimit)} ${policy.asset}`);
  console.log(`  Active:           ${policy.isActive}`);
  console.log();

  const isAuth = await proxima.policy.isAuthorized(policyId, agentKeypair.publicKey());
  console.log(`Agent authorized: ${isAuth ? '✅ yes' : '❌ no'}\n`);

  // ── 4. Check remaining allowance ─────────────────────────────────────────

  const allowanceBefore = await proxima.policy.remainingAllowanceDisplay(policyId);
  console.log(`Remaining allowance before payment: ${allowanceBefore}\n`);

  // ── 5. Agent pays autonomously — owner does NOT sign ─────────────────────
  //
  //    This is the key moment: the AGENT signs, not the owner.
  //    The Soroban contract enforces the limits on-chain.

  console.log('Step 2: Agent executes autonomous payment (no owner signature)...');

  const payment = await proxima.policy.executePayment(
    {
      policyId,
      recipient: recipientKeypair.publicKey(),
      amount: '0.01',                           // 0.01 USDC — within the 0.50 cap
      memo: 'API call #001 — web-search result',
    },
    agentKeypair  // ← agent signs, NOT the owner
  );

  console.log('\n✅ Payment executed autonomously!');
  console.log(`  Policy ID:    ${payment.policyId}`);
  console.log(`  Amount:       ${fromStroops(payment.amount)} ${payment.asset}`);
  console.log(`  Recipient:    ${payment.recipient}`);
  console.log(`  Memo:         ${payment.memo}`);
  console.log(`  Ledger:       ${payment.ledger}`);
  console.log();

  // ── 6. Show updated allowance ─────────────────────────────────────────────

  const allowanceAfter = await proxima.policy.remainingAllowanceDisplay(policyId);
  console.log(`Remaining allowance after payment: ${allowanceAfter}\n`);

  // ── 7. Demonstrate per-tx limit enforcement ───────────────────────────────

  console.log('Step 3: Attempt to exceed per-tx limit (should fail)...');
  try {
    await proxima.policy.executePayment(
      {
        policyId,
        recipient: recipientKeypair.publicKey(),
        amount: '1.00',  // ← exceeds 0.50 USDC max per tx
        memo: 'This should be rejected',
      },
      agentKeypair
    );
    console.log('ERROR: payment should have been rejected!');
  } catch (err) {
    if (err instanceof ProximaError && err.code === ErrorCodes.CONTRACT_ERROR) {
      console.log('✅ Contract correctly rejected the over-limit payment.\n');
    } else {
      throw err;
    }
  }

  // ── 8. Owner revokes the policy ───────────────────────────────────────────

  console.log('Step 4: Owner revokes the policy...');
  await proxima.policy.revoke(policyId, ownerKeypair);
  console.log('✅ Policy revoked.\n');

  const revokedPolicy = await proxima.policy.getPolicy(policyId);
  console.log(`Policy is now active: ${revokedPolicy.isActive}`);
  console.log(`Agent is now authorized: ${await proxima.policy.isAuthorized(policyId, agentKeypair.publicKey())}`);

  console.log('\n─── Demo complete ────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('\nError:', err.message ?? err);
  process.exit(1);
});
