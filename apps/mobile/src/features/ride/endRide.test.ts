import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ finishRide: vi.fn(), attachToActive: vi.fn(), queueRideForOsm: vi.fn(), source: 'gps' as 'gps' | 'sim' }));
vi.mock('@/lib/finishRide', () => ({ finishRide: m.finishRide }));
vi.mock('@/lib/osmShare', () => ({ queueRideForOsm: m.queueRideForOsm }));
vi.mock('@/store/trips', () => ({ useTrips: { getState: () => ({ attachToActive: m.attachToActive }) } }));
vi.mock('@/store/recorder', () => ({ useRecorder: { getState: () => ({ source: m.source }) } }));

import { endRide } from './endRide';

describe('endRide', () => {
  beforeEach(() => { m.finishRide.mockReset(); m.attachToActive.mockReset(); m.queueRideForOsm.mockReset(); m.source = 'gps'; });

  it('endRide files the ride, attaches it to the active trip and queues it for OSM only for a gps ride', async () => {
    m.finishRide.mockResolvedValue('r1');
    expect(await endRide()).toBe('r1');
    expect(m.attachToActive).toHaveBeenCalledWith('r1');
    expect(m.queueRideForOsm).toHaveBeenCalledWith('r1', true);

    m.source = 'sim';
    m.finishRide.mockResolvedValue('r2');
    expect(await endRide()).toBe('r2');
    expect(m.queueRideForOsm).toHaveBeenLastCalledWith('r2', false);

    // A ride that could not be written stays on the phone: nothing is attached or queued.
    m.attachToActive.mockReset(); m.queueRideForOsm.mockReset();
    m.finishRide.mockRejectedValue(new Error('disk'));
    expect(await endRide()).toBeUndefined();
    expect(m.attachToActive).not.toHaveBeenCalled();
    expect(m.queueRideForOsm).not.toHaveBeenCalled();
  });

  it('doStop in live.tsx calls endRide', () => {
    const src = readFileSync(join(__dirname, '../../../app/ride/live.tsx'), 'utf8');
    const body = src.match(/const doStop = async \(\) => \{([\s\S]*?)\n {2}\};/)?.[1] ?? '';
    expect(body).toMatch(/buzz\.stop\(\)/);
    expect(body).toMatch(/stopping\.current = true/);
    expect(body).toMatch(/await endRide\(\)/);
    expect(body).not.toMatch(/finishRide|queueRideForOsm|attachToActive/);
  });
});
