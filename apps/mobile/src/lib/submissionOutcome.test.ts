import { describe, expect, it } from 'vitest';
import { outcomeFor, outcomeText } from './submissionOutcome';

const items = [
  { id: 's1', status: 'submitted', title: 'Nandi loop', trailSlug: 'nandi-loop', updatedAt: '2026-10-30T00:00:00Z' },
  { id: 's2', status: 'changes_requested', title: 'Other', trailSlug: 'other', updatedAt: '2026-10-29T00:00:00Z' },
];

describe('submission outcome', () => {
  it('finds the server submission for a ride by the trail slug it was sent under', () => {
    expect(outcomeFor(items, 'nandi-loop')).toEqual({ id: 's1', status: 'submitted' });
    expect(outcomeFor(items, 'nope')).toBeUndefined();
  });
  it('does not show a draft or a withdrawn submission as an outcome', () => {
    expect(outcomeFor([{ ...items[0]!, status: 'draft' }], 'nandi-loop')).toBeUndefined();
    expect(outcomeFor([{ ...items[0]!, status: 'withdrawn' }], 'nandi-loop')).toBeUndefined();
  });
  it('says what each status means for the rider, with the moderator\'s words when there are some', () => {
    expect(outcomeText('submitted')).toMatchObject({ label: 'In review', tone: 'unknown' });
    expect(outcomeText('approved')).toMatchObject({ label: 'Approved', tone: 'good' });
    expect(outcomeText('changes_requested', 'Please trim the first 300 m')).toMatchObject({ label: 'Changes requested', tone: 'caution', note: 'Please trim the first 300 m' });
    expect(outcomeText('rejected', 'Private road')).toMatchObject({ label: 'Not accepted', tone: 'stop', note: 'Private road' });
  });
  it('never promises a trail is published or verified', () => {
    expect(outcomeText('approved').label.toLowerCase()).not.toMatch(/verified|live|published/);
  });
});
