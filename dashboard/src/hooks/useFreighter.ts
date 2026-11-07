/**
 * useFreighter.ts
 *
 * React hook for Freighter wallet integration using the official
 * @stellar/freighter-api v6 package.
 *
 * The old window.freighter injection was removed in newer Freighter versions.
 * All interaction now goes through the named exports of the freighter-api package.
 *
 * @see https://docs.freighter.app
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isConnected as freighterIsConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction as freighterSignTx,
} from '@stellar/freighter-api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FreighterState {
  /** Whether the Freighter extension is installed and reachable */
  isInstalled: boolean;
  /** Whether the user has granted this site access to their wallet */
  isConnected: boolean;
  /** Connected Stellar public key, or null if not connected */
  publicKey: string | null;
  /** Active Stellar network name (e.g. "TESTNET") */
  network: string | null;
  /** Whether a connect/sign operation is in progress */
  loading: boolean;
  /** Last error message, if any */
  error: string | null;
}

export interface FreighterActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string | null>;
}

// ─── useFreighter ─────────────────────────────────────────────────────────────

export function useFreighter(): FreighterState & FreighterActions {
  const [state, setState] = useState<FreighterState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    network: null,
    loading: false,
    error: null,
  });

  // ── Detect installation and restore an existing session on mount ──────────

  useEffect(() => {
    const detect = async () => {
      try {
        // isConnected() resolves even when the extension is absent — it returns
        // { isConnected: false } in that case.  If the call itself throws, the
        // extension is truly not present (e.g. in a non-browser environment).
        const connResult = await freighterIsConnected();

        if (!connResult.isConnected) {
          // Extension is installed but the user has not yet granted access.
          // Mark as installed so we show the "Connect Wallet" button.
          setState((s) => ({ ...s, isInstalled: true }));

          // Also check whether the site is already on the allow-list
          // (i.e. user connected before and the permission persists).
          const allowResult = await isAllowed();
          if (allowResult.isAllowed) {
            // Allowed but getAddress() returns the key without a new popup.
            const addrResult = await getAddress();
            if (!addrResult.error && addrResult.address) {
              const netResult = await getNetwork();
              setState((s) => ({
                ...s,
                isInstalled: true,
                isConnected: true,
                publicKey: addrResult.address,
                network: netResult.network ?? null,
              }));
            }
          }
          return;
        }

        // isConnected === true means extension is installed AND already allowed.
        const addrResult = await getAddress();
        if (addrResult.error || !addrResult.address) {
          setState((s) => ({ ...s, isInstalled: true }));
          return;
        }

        const netResult = await getNetwork();
        setState((s) => ({
          ...s,
          isInstalled: true,
          isConnected: true,
          publicKey: addrResult.address,
          network: netResult.network ?? null,
        }));
      } catch {
        // freighter-api throws when the extension is not installed at all
        setState((s) => ({ ...s, isInstalled: false }));
      }
    };

    detect();
  }, []);

  // ── connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // requestAccess() prompts Freighter to grant this site permission.
      // It returns the selected account address on success.
      const result = await requestAccess();

      if (result.error) throw new Error(String(result.error));
      if (!result.address) throw new Error('No address returned from Freighter.');

      const netResult = await getNetwork();

      setState((s) => ({
        ...s,
        isInstalled: true,
        isConnected: true,
        publicKey: result.address,
        network: netResult.network ?? null,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  // ── disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      isConnected: false,
      publicKey: null,
      network: null,
      error: null,
    }));
  }, []);

  // ── signTransaction ───────────────────────────────────────────────────────

  const signTransaction = useCallback(
    async (xdr: string): Promise<string | null> => {
      if (!state.publicKey) {
        setState((s) => ({ ...s, error: 'Wallet not connected.' }));
        return null;
      }

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await freighterSignTx(xdr, { address: state.publicKey });

        if (result.error) throw new Error(String(result.error));

        setState((s) => ({ ...s, loading: false }));
        return result.signedTxXdr;
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: (err as Error).message,
        }));
        return null;
      }
    },
    [state.publicKey]
  );

  return { ...state, connect, disconnect, signTransaction };
}
