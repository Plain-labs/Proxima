import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Proxima, type ProximaConfig, type Network } from '@proxima/sdk';

/**
 * Configuration options for the StellarMind SDK.
 * 
 * @example
 * ```tsx
 * const config: StellarMindConfig = {
 *   network: 'testnet',
 *   registryContractId: 'CDTHE5SNO7...',
 *   policyContractId: 'CA4ZN5RGGK...',
 * }
 * ```
 */
export interface StellarMindConfig {
  /** Target network (mainnet, testnet, futurenet) */
  network: Network;
  /** Custom RPC URL (optional — defaults to SDF public RPC) */
  rpcUrl?: string;
  /** Custom Horizon URL (optional) */
  horizonUrl?: string;
  /** Deployed Registry contract ID */
  registryContractId?: string;
  /** Deployed Policy contract ID */
  policyContractId?: string;
}

/**
 * Context value provided by StellarMindProvider.
 */
interface StellarMindContextValue {
  /** The Proxima SDK instance */
  proxima: Proxima;
  /** The current configuration */
  config: StellarMindConfig;
}

const StellarMindContext = createContext<StellarMindContextValue | null>(null);

/**
 * Props for the StellarMindProvider component.
 */
interface StellarMindProviderProps {
  /** SDK configuration */
  config: StellarMindConfig;
  /** Child components */
  children: ReactNode;
}

/**
 * Context provider that initializes and shares a single Proxima SDK instance
 * across all child components. All hooks (useAgent, useAgentSearch, usePolicy, etc.)
 * read from this context.
 * 
 * @example
 * ```tsx
 * // In your app root (e.g. main.tsx or App.tsx):
 * import { StellarMindProvider } from './lib/stellarmind';
 * 
 * function Root() {
 *   return (
 *     <StellarMindProvider config={{ network: 'testnet' }}>
 *       <App />
 *     </StellarMindProvider>
 *   );
 * }
 * ```
 * 
 * @param props.config - SDK configuration object
 * @param props.children - Child components that will have access to the SDK
 */
export function StellarMindProvider({ config, children }: StellarMindProviderProps) {
  const value = useMemo<StellarMindContextValue>(() => {
    const proximaConfig: ProximaConfig = {
      network: config.network,
      rpcUrl: config.rpcUrl,
      horizonUrl: config.horizonUrl,
      registryContractId: config.registryContractId,
      policyContractId: config.policyContractId,
    };
    return {
      proxima: new Proxima(proximaConfig),
      config,
    };
  }, [
    config.network,
    config.rpcUrl,
    config.horizonUrl,
    config.registryContractId,
    config.policyContractId,
  ]);

  return (
    <StellarMindContext.Provider value={value}>
      {children}
    </StellarMindContext.Provider>
  );
}

/**
 * Hook to access the memoized StellarMind (Proxima) SDK instance.
 * 
 * The instance is recreated only when the config changes, ensuring stable
 * references across re-renders. Must be used within a StellarMindProvider.
 * 
 * @returns The Proxima SDK instance
 * @throws Error if used outside of StellarMindProvider
 * 
 * @example
 * ```tsx
 * function AgentRegistrar() {
 *   const proxima = useStellarMind();
 *   
 *   const registerAgent = async () => {
 *     await proxima.registry.register({
 *       id: 'my-agent',
 *       name: 'My Agent',
 *       description: 'A sample agent',
 *       capabilities: ['text-generation'],
 *       pricePerCall: '0.01',
 *       paymentAsset: 'USDC',
 *     }, keypair);
 *   };
 *   
 *   return <button onClick={registerAgent}>Register</button>;
 * }
 * ```
 */
export function useStellarMind(): Proxima {
  const context = useContext(StellarMindContext);
  if (!context) {
    throw new Error(
      'useStellarMind must be used within a StellarMindProvider. ' +
      'Wrap your app with <StellarMindProvider config={{ network: "testnet" }}>.'
    );
  }
  return context.proxima;
}

/**
 * Hook to access the current SDK configuration.
 * Useful for displaying the active network or debugging.
 * 
 * @returns The current StellarMindConfig
 * @throws Error if used outside of StellarMindProvider
 * 
 * @example
 * ```tsx
 * function NetworkBadge() {
 *   const config = useStellarMindConfig();
 *   return <span>Connected to {config.network}</span>;
 * }
 * ```
 */
export function useStellarMindConfig(): StellarMindConfig {
  const context = useContext(StellarMindContext);
  if (!context) {
    throw new Error(
      'useStellarMindConfig must be used within a StellarMindProvider.'
    );
  }
  return context.config;
}
