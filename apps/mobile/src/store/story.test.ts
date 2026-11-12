import { beforeEach, describe, expect, it, vi } from 'vitest';

// The phone's storage is not available here; keep the state in memory.
vi.mock('./persist', () => ({ storage: undefined }));
import { useStory } from './story';

beforeEach(() => useStory.getState().wipe());

describe('useStory', () => {
  it('raiseTitle never lowers a title', () => {
    const s = useStory.getState();
    expect(s.raiseTitle('ghat-rider')).toBe(true);
    expect(useStory.getState().raiseTitle('trail-regular')).toBe(false);
    expect(useStory.getState().title).toBe('ghat-rider');
    expect(useStory.getState().raiseTitle('ghat-rider')).toBe(false);
  });
  it('remembers seen ids once and clears with wipe', () => {
    useStory.getState().markSeen('a'); useStory.getState().markSeen('a'); useStory.getState().noteShown('a');
    expect(useStory.getState().seen).toEqual(['a']);
    expect(useStory.getState().shownThisSession).toEqual(['a']);
    useStory.getState().wipe();
    expect(useStory.getState().seen).toEqual([]);
    expect(useStory.getState().shownThisSession).toEqual([]);
  });
});

describe('pending', () => {
  it('keeps unique, unseen moments and clears with wipe', () => {
    const m = (id: string) => ({ id, kind: 'mark' as const, title: id, body: '', pose: 'hello' as const });
    useStory.getState().markSeen('s');
    useStory.getState().queue([m('a'), m('a'), m('s')]);
    useStory.getState().queue([m('a'), m('b')]);
    expect(useStory.getState().pending.map((x) => x.id)).toEqual(['a', 'b']);
    useStory.getState().unqueue('a');
    expect(useStory.getState().pending.map((x) => x.id)).toEqual(['b']);
    useStory.getState().wipe();
    expect(useStory.getState().pending).toEqual([]);
  });
});
