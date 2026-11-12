import { describe, expect, it } from 'vitest';
import type { GroupCapacity } from '@/api/groups';
import { needsUpgradePrompt, optionLine, rupees } from './groupUpgrade';

const cap = (o: Partial<GroupCapacity>): GroupCapacity => ({ plan: 'free', limit: 5, used: 5, upgrades: [{ plan: 'large_ride_pass', limit: 20, pricePaise: 9900, per: 'ride' }], ...o });

describe('group ride upgrade copy', () => {
  it('formats prices', () => { expect(rupees(9900)).toBe('₹99'); expect(rupees(24950)).toBe('₹249.50'); });
  it('describes each option without saying buy', () => {
    expect(optionLine({ plan: 'large_ride_pass', limit: 20, pricePaise: 9900, per: 'ride' })).toBe('Up to 20 riders on this ride, ₹99 once');
    expect(optionLine({ plan: 'organiser', limit: 50, pricePaise: 24900, per: 'month' })).toBe('Up to 50 riders on every ride you lead, ₹249 a month');
  });
  it('prompts only when full and something would raise it', () => {
    expect(needsUpgradePrompt(cap({}))).toBe(true);
    expect(needsUpgradePrompt(cap({ used: 4 }))).toBe(false);
    expect(needsUpgradePrompt(cap({ upgrades: [] }))).toBe(false);
    expect(needsUpgradePrompt(undefined)).toBe(false);
  });
});
