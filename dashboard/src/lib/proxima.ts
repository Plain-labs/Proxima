/**
 * proxima.ts
 *
 * Singleton Proxima SDK instance for the dashboard.
 * All components and hooks import from here rather than constructing
 * their own instances, which keeps network config in one place.
 */

import { Proxima } from '@proxima/sdk';
import type {
  Agent,
  SpendingPolicy,
  PaymentRecord,
  RegisterAgentParams,
  CreatePolicyParams,
  ExecutePaymentParams,
  FindAgentsParams,
  ProximaConfig,
  Network,
} from '@proxima/sdk';

// ─── Re-export SDK types so dashboard code only needs one import path ─────────
export type {
  Agent,
  SpendingPolicy,
  PaymentRecord,
  RegisterAgentParams,
  CreatePolicyParams,
  ExecutePaymentParams,
  FindAgentsParams,
};

// ─── Network selection ────────────────────────────────────────────────────────
// The active network is controlled by the VITE_NETWORK env variable.
// Falls back to 'testnet' for local development.

function resolveNetwork(): Network {
  const env = import.meta.env['VITE_NETWORK'];
  if (env === 'mainnet' || env === 'testnet' || env === 'futurenet') return env;
  return 'testnet';
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: Proxima | null = null;

/**
 * Returns the shared Proxima SDK instance.
 * Initialises it on first call — cheap because no network calls happen
 * until a method is actually invoked.
 */
export function getProxima(): Proxima {
  if (!_instance) {
    const config: ProximaConfig = {
      network: resolveNetwork(),
      // Override contract IDs via env vars for custom deployments:
      registryContractId: import.meta.env['VITE_REGISTRY_CONTRACT_ID'],
      policyContractId: import.meta.env['VITE_POLICY_CONTRACT_ID'],
    };
    _instance = new Proxima(config);
  }
  return _instance;
}

/**
 * Re-initialise the singleton with a new config.
 * Useful when the user switches networks in the UI.
 */
export function reinitialiseProxima(config: ProximaConfig): Proxima {
  _instance = new Proxima(config);
  return _instance;
}

// ─── Network metadata ─────────────────────────────────────────────────────────

export interface NetworkInfo {
  name: Network;
  label: string;
  color: string;
  explorerBase: string;
}

export const NETWORK_INFO: Record<Network, NetworkInfo> = {
  mainnet: {
    name: 'mainnet',
    label: 'STELLAR MAINNET',
    color: '#00ff78',
    explorerBase: 'https://stellar.expert/explorer/public',
  },
  testnet: {
    name: 'testnet',
    label: 'STELLAR TESTNET',
    color: '#00c8ff',
    explorerBase: 'https://stellar.expert/explorer/testnet',
  },
  futurenet: {
    name: 'futurenet',
    label: 'FUTURENET',
    color: '#ffb830',
    explorerBase: 'https://stellar.expert/explorer/futurenet',
  },
};

export function getCurrentNetworkInfo(): NetworkInfo {
  return NETWORK_INFO[resolveNetwork()];
}

/**
 * Build a Stellar Expert link for a transaction hash.
 */
export function txExplorerUrl(txHash: string): string {
  const info = getCurrentNetworkInfo();
  return `${info.explorerBase}/tx/${txHash}`;
}

/**
 * Build a Stellar Expert link for an account address.
 */
export function accountExplorerUrl(address: string): string {
  const info = getCurrentNetworkInfo();
  return `${info.explorerBase}/account/${address}`;
}
