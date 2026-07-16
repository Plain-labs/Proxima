import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file for the current mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Make VITE_* env vars available at build time
    define: {
      __APP_VERSION__: JSON.stringify(process.env['npm_package_version'] ?? '0.1.0'),
    },

    build: {
      // Produce source maps for easier debugging of production issues
      sourcemap: mode !== 'production',

      // Raise the chunk warning limit slightly (the Stellar SDK is large)
      chunkSizeWarningLimit: 800,

      rollupOptions: {
        output: {
          // Split vendor code so the app chunk stays small
          manualChunks: {
            'stellar-sdk': ['@stellar/stellar-sdk'],
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },

    server: {
      port: 5173,
      // Proxy Stellar RPC to avoid CORS issues in local development
      proxy:
        env['VITE_PROXY_RPC'] === 'true'
          ? {
              '/soroban-rpc': {
                target: env['VITE_RPC_URL'] ?? 'https://soroban-testnet.stellar.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/soroban-rpc/, ''),
              },
            }
          : undefined,
    },
  };
});
