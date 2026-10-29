import { describe, expect, it } from 'vitest';
import { codeFromInvite, inviteUrl, normalizeInviteCode } from './inviteLink';

describe('inviteUrl', () => {
  it('is the site address, /join/ and the code, whether or not the base ends in a slash', () => {
    expect(inviteUrl('https://myto-trails.vercel.app', 'ABC234')).toBe('https://myto-trails.vercel.app/join/ABC234');
    expect(inviteUrl('https://myto-trails.vercel.app/', 'ABC234')).toBe('https://myto-trails.vercel.app/join/ABC234');
  });
});

describe('normalizeInviteCode', () => {
  it('ignores case and spaces', () => {
    expect(normalizeInviteCode(' abc 234 ')).toBe('ABC234');
  });
  it('refuses a code of the wrong length or with letters the server never makes (I, L, O, 0, 1)', () => {
    expect(normalizeInviteCode('ABC23')).toBeNull();
    expect(normalizeInviteCode('ABC2345')).toBeNull();
    expect(normalizeInviteCode('ABCI23')).toBeNull();
    expect(normalizeInviteCode('ABC0O1')).toBeNull();
    expect(normalizeInviteCode('')).toBeNull();
  });
});

describe('codeFromInvite', () => {
  it('reads a pasted https invite link, with or without a trailing slash or query', () => {
    expect(codeFromInvite('https://myto-trails.vercel.app/join/ABC234')).toBe('ABC234');
    expect(codeFromInvite('https://myto-trails.vercel.app/join/abc234/?utm=x#top')).toBe('ABC234');
  });
  it('reads a myto:// link and a bare code in any case', () => {
    expect(codeFromInvite('myto://join/ABC234')).toBe('ABC234');
    expect(codeFromInvite('abc234')).toBe('ABC234');
    expect(codeFromInvite('  ABC 234 ')).toBe('ABC234');
  });
  it('finds the link inside a whole shared message', () => {
    expect(codeFromInvite('Join my group ride "Sunday to Nandi" on Myto Moto: https://myto-trails.vercel.app/join/XK7P2M  (or open Ride, then Group ride, and enter code XK7P2M)')).toBe('XK7P2M');
  });
  it('is null when there is no valid code', () => {
    expect(codeFromInvite('hello there')).toBeNull();
    expect(codeFromInvite('https://myto-trails.vercel.app/join/NOPE')).toBeNull();
    expect(codeFromInvite('')).toBeNull();
  });
});
