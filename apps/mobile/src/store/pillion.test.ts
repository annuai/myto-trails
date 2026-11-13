import { beforeEach, describe, expect, it, vi } from 'vitest';

// The phone's storage is not available here; keep the state in memory.
vi.mock('./persist', () => ({ storage: undefined }));
import { visitOf } from '@/lib/story/visits';
import { usePillion } from './pillion';

const s = () => usePillion.getState();
beforeEach(() => s().wipe());

describe('pillion store', () => {
  it('counts opens and remembers the first', () => {
    s().noteOpen(100);
    s().noteOpen(200);
    expect(s().opens).toBe(2);
    expect(s().firstOpenAt).toBe(100);
    expect(s().lastOpenAt).toBe(200);
  });

  it('a rider who already had the app is existing, and is planned for at once', () => {
    s().noteOpen(1);
    s().observeOnboarding(true, 1);
    s().ensurePlan(() => 0);
    expect(s().origin).toBe('existing');
    expect(s().plan).toEqual({ opens: 2, at: 0 });
  });

  it('a new rider is planned for only once the welcome flow is done, a day after it', () => {
    s().noteOpen(1);
    s().observeOnboarding(false, 1);
    s().ensurePlan(() => 0);
    expect(s().origin).toBe('new');
    expect(s().plan).toBeUndefined();
    s().observeOnboarding(true, 5000);
    s().ensurePlan(() => 0);
    expect(s().onboardedAt).toBe(5000);
    expect(s().plan).toEqual({ opens: 3, at: 5000 + 86_400_000 });
  });

  it('is not planned again once greeted, and a dismissed hello marks it greeted', () => {
    s().noteOpen(1);
    s().observeOnboarding(true, 1);
    s().show(visitOf('hello'), 'hello', 10);
    expect(s().current?.visit.id).toBe('hello');
    s().dismiss();
    expect(s().current).toBeNull();
    expect(s().greeted).toBe(true);
    s().ensurePlan(() => 0);
    expect(s().plan).toBeUndefined();
  });

  it('a visit that is not the greeting does not mark it greeted', () => {
    s().show(visitOf('waiting'), 'link:waiting:1', 10);
    s().dismiss();
    expect(s().greeted).toBe(false);
  });

  it('shows a queued visit once: showing it clears it, and a shown key is not queued again', () => {
    s().queue({ id: 'finished', key: 'ride:1', at: 1 });
    expect(s().pending?.key).toBe('ride:1');
    s().show(visitOf('finished'), 'ride:1', 2);
    expect(s().pending).toBeUndefined();
    s().queue({ id: 'finished', key: 'ride:1', at: 3 });
    expect(s().pending).toBeUndefined();
  });

  it('wipe forgets everything', () => {
    s().noteOpen(1);
    s().observeOnboarding(true, 1);
    s().wipe();
    expect(s().opens).toBe(0);
    expect(s().origin).toBeUndefined();
    expect(s().greeted).toBe(false);
  });
});
