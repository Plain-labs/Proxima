/**
 * useFreighter.ts
 *
 * React hook for Freighter wallet integration.
 *
 * Freighter is the official Stellar browser wallet extension.
 * This hook handles:
 *  - Detecting whether Freighter is installed
 *  - Connecting / disconnecting the wallet
 *  - Reading the connected public key
 *  - Signing transactions before submission
 *
 * @see https://docs.freighter.app
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Freighter browser API types ─────────────────────────────────────────────
// Freighter injects window.freighter — we declare a minimal shape here
// so we don't need a full type package.

interface FreighterAPI {
  isConnected(): Promise<{ isConnected: boolean }>;
  requestAccess(): Promise<{ address: string; error?: string }>;
  getAddress(): Promise<{ address: string; error?: string }>;
  getNetwork(): Promise<{ network: string; networkPassphrase: string; error?: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ): Promise<{ signedTxXdr: string; signerAddress: string; error?: string }>;
}

declare global {
  interface Window {
    freighter?: FreighterAPI;
  }
}

// ─── Hook state ───────────────────────────────────────────────────────────────

export interface FreighterState {
  /** Whether the Freighter extension is installed in the browser */
  isInstalled: boolean;
  /** Whether the user has connected their wallet */
  isConnected: boolean;
  /** Connected Stellar public key, or null if not connected */
  publicKey: string | null;
  /** Active Stellar network ("TESTNET" | "PUBLIC" etc.) */
  network: string | null;
  /** Whether a connection/signing operation is in progress */
  loading: boolean;
  /** Last error message, if any */
  error: string | null;
}

export interface FreighterActions {
  /** Prompt the user to connect their Freighter wallet */
  connect: () => Promise<void>;
  /** Disconnect (clears local state — Freighter has no explicit disconnect API) */
  disconnect: () => void;
  /**
   * Sign a transaction XDR string with the connected wallet.
   * Returns the signed XDR, ready to submit to the Stellar RPC.
   */
  signTransaction: (xdr: string) => Promise<string | null>;
}

// ─── useFreighter ─────────────────────────────────────────────────────────────

/**
 * Hook for Freighter wallet integration.
 *
 * @example
 * ```tsx
 * const { isInstalled, isConnected, publicKey, connect, signTransaction } = useFreighter()
 *
 * if (!isInstalled) return <p>Please install Freighter</p>
 * if (!isConnected) return <button onClick={connect}>Connect Wallet</button>
 * return <p>Connected: {publicKey}</p>
 * ```
 */
export function useFreighter(): FreighterState & FreighterActions {
  const [state, setState] = useState<FreighterState>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    network: null,
    loading: false,
    error: null,
  });

  // ── Detect installation and restore session on mount ──────────────────────

  useEffect(() => {
    const check = async () => {
      const freighter = window.freighter;
      if (!freighter) {
        setState((s) => ({ ...s, isInstalled: false }));
        return;
      }

      setState((s) => ({ ...s, isInstalled: true }));

      try {
        const { isConnected } = await freighter.isConnected();
        if (!isConnected) return;

        const { address, error } = await freighter.getAddress();
        if (error || !address) return;

        const netResult = await freighter.getNetwork();

        setState((s) => ({
          ...s,
          isConnected: true,
          publicKey: address,
          network: netResult.network ?? null,
        }));
      } catch {
        // Extension present but not yet authorised — normal state, no error
      }
    };

    check();
  }, []);

  // ── connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const freighter = window.freighter;
    if (!freighter) {
      setState((s) => ({
        ...s,
        error: 'Freighter is not installed. Visit https://freighter.app to install it.',
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const { address, error } = await freighter.requestAccess();
      if (error) throw new Error(error);
      if (!address) throw new Error('No address returned from Freighter.');

      const netResult = await freighter.getNetwork();

      setState((s) => ({
        ...s,
        isConnected: true,
        publicKey: address,
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
      const freighter = window.freighter;
      if (!freighter || !state.publicKey) {
        setState((s) => ({ ...s, error: 'Wallet not connected.' }));
        return null;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const result = await freighter.signTransaction(xdr, {
          address: state.publicKey,
        });

        if (result.error) throw new Error(result.error);

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
