import { describe, expect, it } from 'vitest';
import { quickWidgetProps } from './quickWidget';

describe('quickWidgetProps', () => {
  it('is empty of numbers when no ride is recording', () => {
    expect(quickWidgetProps({ recording: false, paused: true, group: false, elapsedMs: 5000, meters: 900 })).toMatchObject({ recording: false, paused: false, km: '', clock: '' });
  });
  it('shows distance and whole minutes while riding', () => {
    const p = quickWidgetProps({ recording: true, paused: false, group: true, elapsedMs: 65 * 60_000, meters: 12_340 });
    expect(p).toMatchObject({ recording: true, paused: false, group: true, clock: '1 h 05 min' });
    expect(p.km).not.toBe('');
  });
  it('says paused only while recording', () => {
    expect(quickWidgetProps({ recording: true, paused: true, group: false, elapsedMs: 120_000, meters: 0 })).toMatchObject({ paused: true, clock: '2 min' });
  });
});
