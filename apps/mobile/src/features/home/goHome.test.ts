import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/guideTarget', async () => ({ useGuideTarget: (await import('zustand')).create<{ to?: { lat: number; lng: number; name?: string }; set: (to: { lat: number; lng: number; name?: string }) => void }>((set) => ({ set: (to) => set({ to }) })) }));
vi.mock('@/store/recorder', async () => ({ useRecorder: (await import('zustand')).create<{ status: 'idle' | 'running' }>(() => ({ status: 'idle' })) }));

import { useGuideTarget as guide } from '@/store/guideTarget';
import { useRecorder as rec } from '@/store/recorder';
import { goHome } from './goHome';

const home = { lat: 51.5, lng: -0.12, label: 'Home', setAt: 1 };
const router = () => ({ push: vi.fn() });

describe('goHome', () => {
  beforeEach(() => { guide.setState({ to: undefined }); rec.setState({ status: 'idle' }); });
  it('pushes /navigate with string coordinates by default', () => {
    const r = router();
    goHome(r as never, home);
    expect(r.push).toHaveBeenCalledWith({ pathname: '/navigate', params: { lat: '51.5', lng: '-0.12' } });
    expect(guide.getState().to).toBeUndefined();
  });
  it('record: sets the guide target Home and starts a ride', () => {
    const r = router();
    goHome(r as never, home, { record: true });
    expect(guide.getState().to).toEqual({ lat: 51.5, lng: -0.12, name: 'Home' });
    expect(r.push).toHaveBeenCalledWith({ pathname: '/ride', params: { autostart: '1' } });
  });
  it('record while a ride runs: opens the live ride', () => {
    rec.setState({ status: 'running' });
    const r = router();
    goHome(r as never, home, { record: true });
    expect(r.push).toHaveBeenCalledWith('/ride/live');
  });
});
