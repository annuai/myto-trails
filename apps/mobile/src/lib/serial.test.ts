import { describe, expect, it } from 'vitest';
import { createSerial } from './serial';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createSerial', () => {
  it('runs tasks one after another, in the order they were queued, even when an earlier one is slow', async () => {
    const run = createSerial();
    const log: string[] = [];
    void run(async () => { log.push('stop:begin'); await sleep(30); log.push('stop:end'); });
    await run(async () => { log.push('start:begin'); log.push('start:end'); });
    expect(log).toEqual(['stop:begin', 'stop:end', 'start:begin', 'start:end']);
  });
  it('returns each task\'s own result', async () => {
    const run = createSerial();
    expect(await run(async () => 1)).toBe(1);
    expect(await run(async () => 'two')).toBe('two');
  });
  it('keeps going after a task fails, and still reports that failure to its caller', async () => {
    const run = createSerial();
    await expect(run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await run(async () => 'next')).toBe('next');
  });
});
