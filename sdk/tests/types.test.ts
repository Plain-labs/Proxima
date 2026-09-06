/**
 * Tests for SDK error types and error codes.
 *
 * Run with: bun test
 */

import { describe, it, expect } from 'bun:test';
import { ProximaError, ErrorCodes } from '../src/types';

// ─── ProximaError ─────────────────────────────────────────────────────────────

describe('ProximaError', () => {
  it('extends Error', () => {
    const err = new ProximaError('something went wrong', ErrorCodes.NETWORK_ERROR);
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ProximaError).toBe(true);
  });

  it('sets message correctly', () => {
    const err = new ProximaError('agent not found', ErrorCodes.AGENT_NOT_FOUND);
    expect(err.message).toBe('agent not found');
  });

  it('sets name to ProximaError', () => {
    const err = new ProximaError('test', ErrorCodes.CONTRACT_ERROR);
    expect(err.name).toBe('ProximaError');
  });

  it('stores error code', () => {
    const err = new ProximaError('unauthorized', ErrorCodes.UNAUTHORIZED);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('stores optional details', () => {
    const details = { raw: 'some raw error' };
    const err = new ProximaError('failed', ErrorCodes.CONTRACT_ERROR, details);
    expect(err.details).toEqual(details);
  });

  it('details defaults to undefined when not provided', () => {
    const err = new ProximaError('failed', ErrorCodes.CONTRACT_ERROR);
    expect(err.details).toBeUndefined();
  });

  it('is throwable and catchable', () => {
    const fn = () => {
      throw new ProximaError('test throw', ErrorCodes.NETWORK_ERROR);
    };
    expect(fn).toThrow('test throw');
  });
});

// ─── ErrorCodes ──────────────────────────────────────────────────────────────

describe('ErrorCodes', () => {
  it('has all expected codes', () => {
    expect(ErrorCodes.AGENT_NOT_FOUND).toBe('AGENT_NOT_FOUND');
    expect(ErrorCodes.AGENT_ALREADY_EXISTS).toBe('AGENT_ALREADY_EXISTS');
    expect(ErrorCodes.POLICY_NOT_FOUND).toBe('POLICY_NOT_FOUND');
    expect(ErrorCodes.POLICY_INACTIVE).toBe('POLICY_INACTIVE');
    expect(ErrorCodes.EXCEEDS_PER_TX_LIMIT).toBe('EXCEEDS_PER_TX_LIMIT');
    expect(ErrorCodes.EXCEEDS_DAILY_LIMIT).toBe('EXCEEDS_DAILY_LIMIT');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorCodes.CONTRACT_ERROR).toBe('CONTRACT_ERROR');
  });

  it('has exactly 9 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(9);
  });
});
