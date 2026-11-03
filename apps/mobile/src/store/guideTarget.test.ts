import { beforeEach, describe, expect, it } from 'vitest';
import { useGuideTarget } from './guideTarget';

beforeEach(() => useGuideTarget.getState().clear());

describe('the guide target and a rescue', () => {
  it('goes to a rider and, when the help is given, back to the place underneath without losing it', () => {
    const g = useGuideTarget.getState();
    g.set({ lat: 12, lng: 77, name: 'Manchanabele Dam' });
    g.startRescue({ riderId: 'jithin', name: 'Jithin', startStatus: 'help' });
    expect(useGuideTarget.getState().rescue?.name).toBe('Jithin');
    expect(useGuideTarget.getState().to?.name).toBe('Manchanabele Dam');
    useGuideTarget.getState().endRescue();
    expect(useGuideTarget.getState().rescue).toBeUndefined();
    expect(useGuideTarget.getState().to?.name).toBe('Manchanabele Dam');
  });
  it('clears everything when the ride ends', () => {
    const g = useGuideTarget.getState();
    g.set({ lat: 1, lng: 1 });
    g.startRescue({ riderId: 'a', name: 'A', startStatus: 'ok' });
    useGuideTarget.getState().clear();
    expect(useGuideTarget.getState().to).toBeUndefined();
    expect(useGuideTarget.getState().rescue).toBeUndefined();
  });
});
