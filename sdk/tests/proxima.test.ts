/**
 * Tests for the top-level Proxima class and client instantiation.
 * No real RPC calls — only validates construction and config wiring.
 *
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import { Proxima } from '../src/index';
import { RegistryClient } from '../src/registry';
import { PolicyClient } from '../src/policy';
import { resolveConfig } from '../src/stellar';

// ─── Proxima class ────────────────────────────────────────────────────────────

describe('Proxima', () => {
  it('exposes a registry client', () => {
    const proxima = new Proxima({ network: 'testnet' });
    expect(proxima.registry instanceof RegistryClient).toBe(true);
  });

  it('exposes a policy client', () => {
    const proxima = new Proxima({ network: 'testnet' });
    expect(proxima.policy instanceof PolicyClient).toBe(true);
  });

  it('creates independent instances for different configs', () => {
    const a = new Proxima({ network: 'testnet' });
    const b = new Proxima({ network: 'testnet' });
    // Each call returns a fresh instance
    expect(a.registry).not.toBe(b.registry);
    expect(a.policy).not.toBe(b.policy);
  });

  it('accepts a custom rpcUrl without throwing', () => {
    expect(() => {
      new Proxima({
        network: 'testnet',
        rpcUrl: 'https://soroban-testnet.stellar.org',
      });
    }).not.toThrow();
  });

  it('constructs without throwing even with no contract IDs (lazy validation)', () => {
    // mainnet has empty contract IDs — construction should still succeed
    // because Contract is only instantiated on first method call
    expect(() => new Proxima({ network: 'mainnet' })).not.toThrow();
  });

  it('constructs with futurenet without throwing', () => {
    expect(() => new Proxima({ network: 'futurenet' })).not.toThrow();
  });
});

// ─── RegistryClient instantiation ────────────────────────────────────────────

describe('RegistryClient', () => {
  it('can be instantiated for testnet via resolveConfig', () => {
    const config = resolveConfig({ network: 'testnet' });
    expect(() => new RegistryClient(config)).not.toThrow();
  });

  it('can be instantiated for mainnet via resolveConfig (lazy contract ID)', () => {
    // mainnet has empty contract ID — instantiation defers validation until first call
    const config = resolveConfig({ network: 'mainnet' });
    expect(() => new RegistryClient(config)).not.toThrow();
  });

  it('accepts a custom contract ID override', () => {
    const config = resolveConfig({
      network: 'testnet',
      registryContractId: 'CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R',
    });
    expect(() => new RegistryClient(config)).not.toThrow();
  });
});

// ─── PolicyClient instantiation ──────────────────────────────────────────────

describe('PolicyClient', () => {
  it('can be instantiated for testnet via resolveConfig', () => {
    const config = resolveConfig({ network: 'testnet' });
    expect(() => new PolicyClient(config)).not.toThrow();
  });

  it('can be instantiated for mainnet via resolveConfig (lazy contract ID)', () => {
    const config = resolveConfig({ network: 'mainnet' });
    expect(() => new PolicyClient(config)).not.toThrow();
  });

  it('accepts a custom contract ID override', () => {
    const config = resolveConfig({
      network: 'testnet',
      policyContractId: 'CA4ZN5RGGKBXWYAB36HXTLBB73ROHQKH527GX4GONRWRNVNWFLIHAKKDJ',
    });
    expect(() => new PolicyClient(config)).not.toThrow();
  });
});
