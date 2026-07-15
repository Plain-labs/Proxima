import { Networks, rpc as SorobanRpc, Horizon } from '@stellar/stellar-sdk';
import type { Network, ProximaConfig } from './types';

// ─── Network Defaults ────────────────────────────────────────────────────────

const NETWORK_CONFIG: Record<
  Network,
  { rpcUrl: string; horizonUrl: string; networkPassphrase: string }
> = {
  mainnet: {
    rpcUrl: 'https://mainnet.stellar.validationcloud.io/v1/soroban/rpc',
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: Networks.PUBLIC,
  },
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
  },
  futurenet: {
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    networkPassphrase: Networks.FUTURENET,
  },
};

// ─── Known contract deployments ──────────────────────────────────────────────
// These will be updated once mainnet deployment is complete.

const CONTRACT_IDS: Record<Network, { registry: string; policy: string }> = {
  mainnet: {
    registry: '', // TBD — post deployment
    policy: '',   // TBD — post deployment
  },
  testnet: {
    registry: 'CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R', // deployed June 2026
    policy:   'CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ',
  },
  futurenet: {
    registry: '',
    policy:   '',
  },
};

// ─── USDC Issuers ─────────────────────────────────────────────────────────────

export const USDC_ISSUER: Record<Network, string> = {
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  futurenet: '',
};

// ─── Connection ───────────────────────────────────────────────────────────────

export interface ResolvedConfig {
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  registryContractId: string;
  policyContractId: string;
  network: Network;
}

export function resolveConfig(config: ProximaConfig): ResolvedConfig {
  const defaults = NETWORK_CONFIG[config.network];
  const contracts = CONTRACT_IDS[config.network];

  return {
    rpcUrl: config.rpcUrl ?? defaults.rpcUrl,
    horizonUrl: config.horizonUrl ?? defaults.horizonUrl,
    networkPassphrase: defaults.networkPassphrase,
    registryContractId: config.registryContractId ?? contracts.registry,
    policyContractId: config.policyContractId ?? contracts.policy,
    network: config.network,
  };
}

export function createRpcServer(config: ResolvedConfig): SorobanRpc.Server {
  return new SorobanRpc.Server(config.rpcUrl, { allowHttp: false });
}

export function createHorizonServer(config: ResolvedConfig): Horizon.Server {
  return new Horizon.Server(config.horizonUrl, { allowHttp: false });
}

// ─── Unit Conversion Helpers ──────────────────────────────────────────────────

/** Convert asset units (e.g. "1.50") to stroops (bigint) */
export function toStroops(amount: string): bigint {
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(fracPadded);
}

/** Convert stroops (bigint) to asset units string (e.g. "1.5000000") */
export function fromStroops(stroops: bigint): string {
  const whole = stroops / 10_000_000n;
  const frac = stroops % 10_000_000n;
  return `${whole}.${frac.toString().padStart(7, '0')}`;
}

/** Format reputation score (0–10000) as percentage string */
export function formatReputation(score: number): string {
  return `${(score / 100).toFixed(2)}%`;
}
