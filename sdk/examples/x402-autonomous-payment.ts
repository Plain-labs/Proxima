/**
 * x402 Autonomous Payment Demo
 *
 * This example shows how Proxima's SpendingPolicy integrates with the x402
 * payment protocol to let an AI agent pay for API resources autonomously —
 * no human needs to sign each transaction.
 *
 * Flow:
 *  1. Owner creates a spending policy capping the agent at 10 USDC/day
 *  2. Agent calls a paid API endpoint
 *  3. Server responds 402 Payment Required with price + recipient
 *  4. Agent pays via execute_payment (agent signs, owner not needed)
 *  5. Agent retries the request with proof of payment
 *
 * Run (testnet):
 *   OWNER_SECRET=S... AGENT_SECRET=S... bun run examples/x402-autonomous-payment.ts
 */

import { Keypair } from '@stellar/stellar-sdk';
import { Proxima, USDC_ISSUER } from '../src/index';

// ─── Config ──────────────────────────────────────────────────────────────────

const OWNER_SECRET = process.env.OWNER_SECRET;
const AGENT_SECRET = process.env.AGENT_SECRET;

if (!OWNER_SECRET || !AGENT_SECRET) {
  console.error('Set OWNER_SECRET and AGENT_SECRET environment variables.');
  console.error('Get testnet keys: https://laboratory.stellar.org/#account-creator?network=test');
  process.exit(1);
}

const ownerKeypair = Keypair.fromSecret(OWNER_SECRET);
const agentKeypair = Keypair.fromSecret(AGENT_SECRET);

const proxima = new Proxima({ network: 'testnet' });

// ─── Step 1: Owner creates a spending policy ─────────────────────────────────

async function createPolicy(): Promise<bigint> {
  console.log('\n[1] Creating spending policy...');
  console.log(`    Owner:  ${ownerKeypair.publicKey()}`);
  console.log(`    Agent:  ${agentKeypair.publicKey()}`);

  const policyId = await proxima.policy.create(
    {
      agent: agentKeypair.publicKey(),
      maxPerTx: '0.10',    // max 0.10 USDC per single call
      dailyLimit: '10.00', // max 10 USDC per day total
      asset: 'USDC',
      issuer: USDC_ISSUER.testnet,
    },
    ownerKeypair, // owner signs the policy creation
  );

  console.log(`    ✓ Policy created — ID: ${policyId}`);
  return policyId;
}

// ─── Step 2: Simulate a 402 response from a paid API ─────────────────────────

interface PaymentRequired {
  amount: string;      // e.g. "0.01"
  recipient: string;   // Stellar address of the API provider
  memo: string;
}

/**
 * Simulates calling a resource server that requires payment.
 * In a real x402 flow this would be an actual HTTP request that returns
 * a 402 status with X-Payment headers.
 */
async function callPaidApi(
  url: string,
  paymentProof?: string,
): Promise<{ status: number; data?: unknown; paymentRequired?: PaymentRequired }> {
  // Simulate the x402 handshake without a real server
  if (!paymentProof) {
    return {
      status: 402,
      paymentRequired: {
        amount: '0.01',
        recipient: 'GDAT5HWTGIU4TSSZ4752OA3QFWNJTYSVMRDBERZ4SCFZ5KSE63Y73FGJ', // mock API provider
        memo: `x402:${url}`,
      },
    };
  }

  // Simulate successful response after payment
  return {
    status: 200,
    data: { result: 'LLM response for your query', tokens: 42 },
  };
}

// ─── Step 3: Agent handles 402 and pays autonomously ─────────────────────────

async function callWithAutonomousPayment(
  url: string,
  policyId: bigint,
): Promise<unknown> {
  console.log(`\n[2] Agent calling: ${url}`);

  const firstAttempt = await callPaidApi(url);

  if (firstAttempt.status === 402 && firstAttempt.paymentRequired) {
    const { amount, recipient, memo } = firstAttempt.paymentRequired;

    console.log(`    ← 402 Payment Required`);
    console.log(`       Amount:    ${amount} USDC`);
    console.log(`       Recipient: ${recipient}`);

    // Check remaining allowance before paying
    const remaining = await proxima.policy.remainingAllowanceDisplay(policyId);
    console.log(`       Remaining allowance: ${remaining}`);

    // Agent pays — NO owner involvement needed
    console.log(`\n[3] Agent executing autonomous payment...`);
    const record = await proxima.policy.executePayment(
      {
        policyId,
        recipient,
        amount,
        memo,
      },
      agentKeypair, // agent signs this, not the owner
    );

    console.log(`    ✓ Payment settled on Stellar`);
    console.log(`       TX ledger: ${record.ledger}`);
    console.log(`       Amount:    ${amount} USDC`);

    // Retry with proof of payment
    console.log(`\n[4] Retrying request with payment proof...`);
    const paymentProof = `policy:${policyId}:ledger:${record.ledger}`;
    const secondAttempt = await callPaidApi(url, paymentProof);

    if (secondAttempt.status === 200) {
      console.log(`    ✓ Success — received API response`);
      return secondAttempt.data;
    }
  }

  return firstAttempt.data;
}

// ─── Step 4: Show updated policy state ───────────────────────────────────────

async function showPolicyState(policyId: bigint): Promise<void> {
  console.log(`\n[5] Policy state after payment:`);
  const policy = await proxima.policy.getPolicy(policyId);
  const remaining = await proxima.policy.remainingAllowanceDisplay(policyId);

  console.log(`    Policy ID:    ${policy.id}`);
  console.log(`    Active:       ${policy.isActive}`);
  console.log(`    Daily limit:  ${Number(policy.dailyLimit) / 10_000_000} USDC`);
  console.log(`    Spent today:  ${Number(policy.spentToday) / 10_000_000} USDC`);
  console.log(`    Remaining:    ${remaining}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Proxima × x402 — Autonomous Payment Demo');
  console.log('  Network: Stellar Testnet');
  console.log('═══════════════════════════════════════════════════');

  try {
    // 1. Owner sets up policy once (could be done days in advance)
    const policyId = await createPolicy();

    // 2. Agent makes multiple calls without owner involvement
    for (let i = 0; i < 3; i++) {
      await callWithAutonomousPayment(
        `https://api.example.com/llm/query?q=task-${i + 1}`,
        policyId,
      );
    }

    // 3. Show final policy state
    await showPolicyState(policyId);

    console.log('\n✓ Demo complete. The agent made 3 autonomous payments.');
    console.log('  The owner signed exactly ONE transaction (the policy creation).');
    console.log('  View on Stellar Explorer: https://stellar.expert/explorer/testnet');
  } catch (err) {
    console.error('\n✗ Error:', (err as Error).message);
    console.error('  Make sure both accounts are funded on testnet.');
    console.error('  Friendbot: https://friendbot.stellar.org?addr=<ADDRESS>');
    process.exit(1);
  }
}

main();
