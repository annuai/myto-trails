import { describe, expect, it } from 'vitest';
import { REACTIONS, withMyReaction } from './reactions';

describe('withMyReaction', () => {
  it('adds a first reaction', () => expect(withMyReaction({}, null, 'fire')).toEqual({ fire: 1 }));
  it('moves your reaction from the old one to the new one', () => expect(withMyReaction({ like: 2, fire: 1 }, 'like', 'fire')).toEqual({ like: 1, fire: 2 }));
  it('takes it back, and drops a count that reaches nothing', () => expect(withMyReaction({ love: 1, like: 3 }, 'love', null)).toEqual({ like: 3 }));
  it('leaves the original counts alone', () => { const c = { like: 1 }; withMyReaction(c, 'like', 'wow'); expect(c).toEqual({ like: 1 }); });
});
describe('REACTIONS', () => {
  it('has the six the site knows', () => expect(REACTIONS.map((r) => r.key)).toEqual(['like', 'love', 'fire', 'laugh', 'wow', 'thanks']));
});
