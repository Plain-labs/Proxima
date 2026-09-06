/**
 * Tests for stellar.ts utility helpers and config resolution.
 * Pure functions — no network calls, no mocking needed.
 *
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import {
  toStroops,
  fromStroops,
  formatReputation,
  resolveConfig,
  USDC_ISSUER,
} from '../src/stellar';

// ─── toStroops ────────────────────────────────────────────────────────────────

describe('toStroops', () => {
  it('converts whole numbers correctly', () => {
    expect(toStroops('1')).toBe(10_000_000n);
    expect(toStroops('10')).toBe(100_000_000n);
    expect(toStroops('0')).toBe(0n);
  });

  it('converts decimal amounts correctly', () => {
    expect(toStroops('0.01')).toBe(100_000n);
    expect(toStroops('0.05')).toBe(500_000n);
    expect(toStroops('1.5')).toBe(15_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
  });

  it('handles 7 decimal places (maximum Stellar precision)', () => {
    expect(toStroops('1.0000000')).toBe(10_000_000n);
    expect(toStroops('0.1234567')).toBe(1_234_567n);
  });

  it('truncates beyond 7 decimal places', () => {
    // Only first 7 fractional digits are used
    expect(toStroops('0.12345678')).toBe(1_234_567n);
  });

  it('roundtrips correctly with fromStroops', () => {
    const amounts = ['0.01', '1.50', '100.00', '0.0000001'];
    for (const amount of amounts) {
      const stroops = toStroops(amount);
      const back = fromStroops(stroops);
      expect(Math.abs(parseFloat(back) - parseFloat(amount))).toBeLessThan(1e-7);
    }
  });
});

// ─── fromStroops ─────────────────────────────────────────────────────────────

describe('fromStroops', () => {
  it('converts stroops to asset units', () => {
    expect(fromStroops(10_000_000n)).toBe('1.0000000');
    expect(fromStroops(100_000n)).toBe('0.0100000');
    expect(fromStroops(1n)).toBe('0.0000001');
    expect(fromStroops(0n)).toBe('0.0000000');
  });

  it('formats large values correctly', () => {
    expect(fromStroops(1_000_000_000n)).toBe('100.0000000');
    expect(fromStroops(500_000_000n)).toBe('50.0000000');
  });

  it('always returns 7 decimal places', () => {
    const result = fromStroops(15_000_000n);
    const decimalPart = result.split('.')[1];
    expect(decimalPart).toHaveLength(7);
  });
});

// ─── formatReputation ────────────────────────────────────────────────────────

describe('formatReputation', () => {
  it('formats score as percentage with 2 decimal places', () => {
    expect(formatReputation(9420)).toBe('94.20%');
    expect(formatReputation(5000)).toBe('50.00%');
    expect(formatReputation(10000)).toBe('100.00%');
    expect(formatReputation(0)).toBe('0.00%');
  });

  it('handles edge cases', () => {
    expect(formatReputation(1)).toBe('0.01%');
    expect(formatReputation(9999)).toBe('99.99%');
  });
});

// ─── resolveConfig ────────────────────────────────────────────────────────────

describe('resolveConfig', () => {
  it('uses testnet defaults when no overrides provided', () => {
    const config = resolveConfig({ network: 'testnet' });

    expect(config.network).toBe('testnet');
    expect(config.rpcUrl).toContain('testnet');
    expect(config.horizonUrl).toContain('testnet');
    expect(config.networkPassphrase).toContain('Test SDF');
    expect(config.registryContractId.length).toBeGreaterThan(0);
    expect(config.policyContractId.length).toBeGreaterThan(0);
  });

  it('uses mainnet defaults when network is mainnet', () => {
    const config = resolveConfig({ network: 'mainnet' });

    expect(config.network).toBe('mainnet');
    expect(config.rpcUrl).toContain('mainnet');
    expect(config.horizonUrl).toBe('https://horizon.stellar.org');
    expect(config.networkPassphrase).toContain('Public Global');
  });

  it('allows overriding rpcUrl', () => {
    const customUrl = 'https://my-custom-rpc.example.com';
    const config = resolveConfig({ network: 'testnet', rpcUrl: customUrl });
    expect(config.rpcUrl).toBe(customUrl);
  });

  it('allows overriding contract IDs', () => {
    const customRegistry = 'CDTHE5SNO7UTBTSSVWAYN5TXYNJXZYOUTRMETMHVB4IHGTNRJ6PKE54R';
    const config = resolveConfig({ network: 'testnet', registryContractId: customRegistry });
    expect(config.registryContractId).toBe(customRegistry);
  });

  it('allows overriding horizonUrl', () => {
    const customHorizon = 'https://my-horizon.example.com';
    const config = resolveConfig({ network: 'testnet', horizonUrl: customHorizon });
    expect(config.horizonUrl).toBe(customHorizon);
  });
});

// ─── USDC_ISSUER ─────────────────────────────────────────────────────────────

describe('USDC_ISSUER', () => {
  it('has entries for all supported networks', () => {
    expect(USDC_ISSUER.mainnet.length).toBeGreaterThan(0);
    expect(USDC_ISSUER.testnet.length).toBeGreaterThan(0);
    expect('futurenet' in USDC_ISSUER).toBe(true);
  });

  it("mainnet issuer is Circle's known address", () => {
    expect(USDC_ISSUER.mainnet).toBe(
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    );
  });

  it('testnet issuer is the known testnet address', () => {
    expect(USDC_ISSUER.testnet).toBe(
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
    );
  });
});
