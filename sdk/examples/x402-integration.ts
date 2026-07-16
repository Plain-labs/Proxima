/**
 * x402-integration.ts
 *
 * Example: Integrating Proxima's SpendingPolicy with the x402 payment protocol.
 *
 * x402 is Stellar's standard for HTTP-native micropayments:
 *   - Resource servers return `402 Payment Required` with an X-Payment header
 *   - Clients pay the required amount and retry with proof
 *
 * Proxima's SpendingPolicy makes this fully autonomous — the agent pays
 * within its policy budget without requiring per-request human approval.
 *
 * See: https://x402.org
 *
 * Usage:
 *   AGENT_SECRET=S... POLICY_ID=1 npx ts-node examples/x402-integration.ts
 */

import { Keypair } from '@stellar/stellar-sdk';
import { Proxima, USDC_ISSUER, fromStroops, ProximaError, ErrorCodes } from '../src/index';

// ─── x402 header parsing ──────────────────────────────────────────────────────

interface X402PaymentDetails {
  /** Amount required in USDC (e.g. "0.01") */
  amount: string;
  /** Stellar address to pay */
  recipient: string;
  /** Payment network ("testnet" | "mainnet") */
  network: string;
  /** Human-readable resource description */
  resource: string;
}

/**
 * Parse the X-Payment header from a 402 response.
 * Example header value:
 *   amount=0.01;recipient=GABC...;network=testnet;resource=/api/search
 */
function parseX402Header(header: string): X402PaymentDetails {
  const parts = Object.fromEntries(
    header.split(';').map((p) => {
      const [k, v] = p.trim().split('=');
      return [k.trim(), v?.trim() ?? ''];
    })
  );
  return {
    amount: parts['amount'] ?? '0',
    recipient: parts['recipient'] ?? '',
    network: parts['network'] ?? 'testnet',
    resource: parts['resource'] ?? '',
  };
}

// ─── Proxima x402 client ──────────────────────────────────────────────────────

class ProximaX402Client {
  private proxima: Proxima;
  private agentKeypair: Keypair;
  private policyId: bigint;

  constructor(agentKeypair: Keypair, policyId: bigint, network: 'testnet' | 'mainnet' = 'testnet') {
    this.proxima = new Proxima({ network });
    this.agentKeypair = agentKeypair;
    this.policyId = policyId;
  }

  /**
   * Fetch a resource, automatically handling 402 Payment Required responses.
   * The agent pays autonomously using the spending policy — no human needed.
   *
   * @param url   URL to fetch
   * @param init  Standard RequestInit options
   * @returns     The final response after successful payment
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    // First attempt
    const response = await fetch(url, init);

    if (response.status !== 402) {
      return response;
    }

    // Parse payment requirement
    const paymentHeader = response.headers.get('X-Payment');
    if (!paymentHeader) {
      throw new Error('402 response missing X-Payment header');
    }

    const payment = parseX402Header(paymentHeader);
    console.log(`\n402 Payment Required`);
    console.log(`  Resource:  ${payment.resource}`);
    console.log(`  Amount:    ${payment.amount} USDC`);
    console.log(`  Recipient: ${payment.recipient}`);

    // Verify our policy can cover this payment
    const remaining = await this.proxima.policy.remainingAllowance(this.policyId);
    const remainingDisplay = fromStroops(remaining);
    console.log(`  Policy remaining allowance: ${remainingDisplay} USDC`);

    // Execute the payment autonomously — agent signs, no owner needed
    console.log('\nExecuting autonomous payment via SpendingPolicy...');
    let record;
    try {
      record = await this.proxima.policy.executePayment(
        {
          policyId: this.policyId,
          recipient: payment.recipient,
          amount: payment.amount,
          memo: `x402: ${payment.resource}`,
        },
        this.agentKeypair
      );
    } catch (err) {
      if (err instanceof ProximaError) {
        if (err.code === ErrorCodes.EXCEEDS_PER_TX_LIMIT) {
          throw new Error(`Payment rejected: amount ${payment.amount} USDC exceeds per-tx policy limit`);
        }
        if (err.code === ErrorCodes.EXCEEDS_DAILY_LIMIT) {
          throw new Error(`Payment rejected: daily policy limit would be exceeded`);
        }
        if (err.code === ErrorCodes.POLICY_INACTIVE) {
          throw new Error(`Payment rejected: spending policy has been revoked`);
        }
      }
      throw err;
    }

    console.log(`✅ Payment executed on Stellar`);
    console.log(`   Ledger: ${record.ledger}`);
    console.log(`   Amount: ${fromStroops(record.amount)} ${record.asset}`);

    // Retry the request with payment proof in header
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set('X-Payment-Proof', JSON.stringify({
      policyId: record.policyId.toString(),
      ledger: record.ledger,
      amount: fromStroops(record.amount),
      asset: record.asset,
    }));

    console.log('\nRetrying request with payment proof...');
    return fetch(url, { ...init, headers: retryHeaders });
  }
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function main() {
  const agentSecret = process.env['AGENT_SECRET'];
  const policyIdStr = process.env['POLICY_ID'];

  if (!agentSecret || !policyIdStr) {
    console.error('Required: AGENT_SECRET and POLICY_ID environment variables');
    console.error('Run the autonomous-payment.ts example first to create a policy.');
    process.exit(1);
  }

  const agentKeypair = Keypair.fromSecret(agentSecret);
  const policyId = BigInt(policyIdStr);

  console.log('─── Proxima x402 Integration Demo ───────────────────');
  console.log(`Agent:     ${agentKeypair.publicKey()}`);
  console.log(`Policy ID: ${policyId}`);
  console.log('─────────────────────────────────────────────────────\n');

  const client = new ProximaX402Client(agentKeypair, policyId, 'testnet');

  // Verify the policy details
  const proxima = new Proxima({ network: 'testnet' });
  const policy = await proxima.policy.getPolicy(policyId);

  console.log('Policy details:');
  console.log(`  Max per tx:   ${fromStroops(policy.maxPerTx)} USDC`);
  console.log(`  Daily limit:  ${fromStroops(policy.dailyLimit)} USDC`);
  console.log(`  Active:       ${policy.isActive}`);

  if (!policy.isActive) {
    console.error('\nPolicy is inactive. Create a new one with autonomous-payment.ts');
    process.exit(1);
  }

  // Simulate a sequence of x402-gated API calls
  const resources = [
    'https://api.example-agent-service.com/v1/search?q=stellar+soroban',
    'https://api.example-agent-service.com/v1/summarize',
    'https://api.example-agent-service.com/v1/translate',
  ];

  console.log('\nSimulating x402 API calls...\n');

  for (const url of resources) {
    console.log(`Fetching: ${url}`);
    try {
      // In a real integration, this would be a live HTTP call to an x402 service.
      // Here we demonstrate the payment logic flow.
      console.log('(Simulated — no live x402 endpoint in this demo)');
      console.log('In production: await client.fetch(url)');
      console.log();
    } catch (err) {
      console.error(`Error: ${(err as Error).message}\n`);
    }
  }

  console.log('─── x402 pattern summary ─────────────────────────────');
  console.log('1. Agent calls resource server');
  console.log('2. Server returns 402 + X-Payment header');
  console.log('3. Agent calls policy.executePayment() — NO owner signature');
  console.log('4. Stellar settles in < 5 seconds');
  console.log('5. Agent retries with X-Payment-Proof header');
  console.log('6. Server delivers resource');
  console.log('\nSpending policy enforces: max per tx + daily cap');
  console.log('Owner can revoke at any time to cut off the agent.');
  console.log('──────────────────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
