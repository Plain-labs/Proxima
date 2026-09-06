/**
 * register-agent.ts
 *
 * Example: Register an AI agent in the Proxima on-chain registry.
 *
 * Usage:
 *   STELLAR_SECRET=S... npx ts-node examples/register-agent.ts
 *
 * Prerequisites:
 *   - A funded Stellar testnet account (get one at https://laboratory.stellar.org)
 *   - The account secret key set in STELLAR_SECRET env variable
 */

import { Keypair } from '@stellar/stellar-sdk';
import { Proxima, USDC_ISSUER, fromStroops } from '../src/index';

async function main() {
  // ── 1. Set up ──────────────────────────────────────────────────────────────

  const secret = process.env['STELLAR_SECRET'];
  if (!secret) {
    console.error('Error: STELLAR_SECRET environment variable is required.');
    console.error('Get a testnet account at https://laboratory.stellar.org');
    process.exit(1);
  }

  const ownerKeypair = Keypair.fromSecret(secret);
  console.log(`\nRegistering agent from wallet: ${ownerKeypair.publicKey()}\n`);

  const proxima = new Proxima({ network: 'testnet' });

  // ── 2. Check if ID is already taken ───────────────────────────────────────

  const agentId = 'my-summarisation-agent-v1';
  const taken = await proxima.registry.agentExists(agentId);

  if (taken) {
    console.log(`Agent ID "${agentId}" is already registered.`);
    const existing = await proxima.registry.getAgent(agentId);
    console.log('Existing agent:', existing);
    return;
  }

  // ── 3. Register ────────────────────────────────────────────────────────────

  console.log(`Registering "${agentId}" on Stellar testnet...`);

  const registeredId = await proxima.registry.register(
    {
      id: agentId,
      name: 'My Summarisation Agent',
      description:
        'Summarises long documents and web pages into concise bullet points. ' +
        'Supports English, Spanish, and French. Average latency: 1.2s.',
      capabilities: ['summarization', 'text-generation', 'multilingual'],
      pricePerCall: '0.005',           // 0.005 USDC per call
      paymentAsset: 'USDC',
      paymentIssuer: USDC_ISSUER.testnet,
      endpointUrl: 'https://my-agent-api.example.com/v1/summarise',
    },
    ownerKeypair
  );

  console.log(`\n✅ Agent registered! ID: ${registeredId}`);

  // ── 4. Verify on-chain ─────────────────────────────────────────────────────

  console.log('\nVerifying on-chain...');
  const agent = await proxima.registry.getAgent(registeredId);

  console.log('\n─── On-chain Agent Data ───────────────────────────');
  console.log(`ID:           ${agent.id}`);
  console.log(`Name:         ${agent.name}`);
  console.log(`Capabilities: ${agent.capabilities.join(', ')}`);
  console.log(`Price:        ${agent.priceDisplay}`);
  console.log(`Reputation:   ${agent.reputationDisplay}  (starts at 50.00%)`);
  console.log(`Total calls:  ${agent.totalCalls}`);
  console.log(`Active:       ${agent.isActive}`);
  console.log(`Registered at ledger: ${agent.registeredAt}`);
  console.log(`Owner:        ${agent.owner}`);
  console.log('───────────────────────────────────────────────────\n');

  // ── 5. Total registry count ────────────────────────────────────────────────

  const count = await proxima.registry.agentCount();
  console.log(`Total agents in registry: ${count}`);

  console.log('\nDone! View the registry at https://proxima-dashboard.vercel.app\n');
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
