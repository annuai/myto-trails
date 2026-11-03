import { describe, expect, it } from 'vitest';
import { documentEntries, expiredEntries, validityWord } from './documentEntries';

describe('documentEntries', () => {
  it('lists only what was added', () => {
    expect(documentEntries()).toEqual([]);
    expect(documentEntries({ number: 'KA01' }, { regNo: 'KA05', pucValidTill: '2027-01-01' }).map((e) => e.kind)).toEqual(['licence', 'rc', 'puc']);
  });
});
describe('registration entry', () => {
  it('adds the engine and chassis numbers when the rider kept them, and only those', () => {
    expect(documentEntries(undefined, { regNo: 'KA01AB1234' })[0].detail).toBe('KA01AB1234');
    expect(documentEntries(undefined, { regNo: 'KA01AB1234', engineNo: 'E1', chassisNo: 'C1' })[0].detail).toBe('KA01AB1234 · Engine E1 · Chassis C1');
  });
});
describe('expiredEntries', () => {
  it('returns only papers past their date', () => {
    const e = documentEntries({ number: 'x', validTill: '2026-01-01' }, { regNo: 'r', insuranceValidTill: '2027-06-01', policyNo: 'p' });
    expect(expiredEntries(e, '2026-06-01').map((x) => x.kind)).toEqual(['licence']);
  });
});

import { papersSummary, paperStatus } from './documentEntries';
describe('paperStatus and papersSummary', () => {
  const today = '2026-06-01';
  it('flags nothing missing as an optional add, never as an error', () => {
    expect(papersSummary(paperStatus(undefined, undefined, today))).toEqual({ status: 'caution', word: 'Add (optional)' });
  });
  it('says which state each paper is in', () => {
    const p = paperStatus({ number: 'x', validTill: '2026-06-10' }, { regNo: 'r', insuranceValidTill: '2025-01-01', policyNo: 'p' }, today);
    expect(p.map((x) => x.state)).toEqual(['soon', 'valid', 'expired', 'missing']);
    expect(papersSummary(p)).toEqual({ status: 'stop', word: '1 expired' });
  });
  it('is silent when everything is valid', () => {
    const p = paperStatus({ number: 'x', validTill: '2030-01-01' }, { regNo: 'r', rcValidTill: '2030-01-01', insuranceValidTill: '2030-01-01', pucValidTill: '2030-01-01' }, today);
    expect(papersSummary(p)).toBeUndefined();
  });
});

describe('validityWord', () => {
  it('says only the year for a date far off, so the chip stays short', () => expect(validityWord('2038-08-07', '2026-11-03')).toEqual({ status: 'good', word: 'Valid to 2038' }));
  it('gives the date within a year, the days within a month, and says expired', () => {
    expect(validityWord('2027-02-10', '2026-11-03').word).toMatch(/^Till /);
    expect(validityWord('2026-11-20', '2026-11-03')).toEqual({ status: 'caution', word: '17 days left' });
    expect(validityWord('2026-10-01', '2026-11-03')).toEqual({ status: 'stop', word: 'Expired' });
    expect(validityWord(undefined)).toEqual({ status: 'unknown', word: 'No date' });
  });
});
