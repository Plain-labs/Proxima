import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StellarMindProvider, type StellarMindConfig } from './lib/stellarmind.tsx'

/**
 * SDK configuration sourced from environment variables.
 * Falls back to testnet for local development.
 */
function resolveConfig(): StellarMindConfig {
  const envNetwork = import.meta.env['VITE_NETWORK'];
  const network = (envNetwork === 'mainnet' || envNetwork === 'testnet' || envNetwork === 'futurenet')
    ? envNetwork
    : 'testnet';

  return {
    network,
    registryContractId: import.meta.env['VITE_REGISTRY_CONTRACT_ID'],
    policyContractId: import.meta.env['VITE_POLICY_CONTRACT_ID'],
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StellarMindProvider config={resolveConfig()}>
      <App />
    </StellarMindProvider>
  </StrictMode>,
)
