import { describe, expect, it } from 'vitest';
import { startPrompt, stepPrompt, STOP_PROMPT_MS } from './stoppedPrompt';

const riding = { running: true, paused: false, stopped: true };

describe('stepPrompt', () => {
  it('asks once, after ten minutes stopped', () => {
    let r = stepPrompt(startPrompt, { now: 0, ...riding });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS - 1, ...riding });
    expect(r.ask).toBe(false);
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS, ...riding });
    expect(r.ask).toBe(true);
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS * 3, ...riding });
    expect(r.ask).toBe(false);
  });
  it('starts over when the rider moves, so the next stop asks again', () => {
    let r = stepPrompt(startPrompt, { now: 0, ...riding });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS, ...riding });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS + 1000, running: true, paused: false, stopped: false });
    expect(r.state).toEqual(startPrompt);
    r = stepPrompt(r.state, { now: 20 * 60_000, ...riding });
    r = stepPrompt(r.state, { now: 20 * 60_000 + STOP_PROMPT_MS, ...riding });
    expect(r.ask).toBe(true);
  });
  it('never asks while paused or when no ride is running', () => {
    let r = stepPrompt(startPrompt, { now: 0, running: true, paused: true, stopped: true });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS * 2, running: true, paused: true, stopped: true });
    expect(r.ask).toBe(false);
    r = stepPrompt(startPrompt, { now: 0, running: false, paused: false, stopped: true });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS * 2, running: false, paused: false, stopped: true });
    expect(r.ask).toBe(false);
  });
  it('counts a pause as the end of the stop', () => {
    let r = stepPrompt(startPrompt, { now: 0, ...riding });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS - 1000, running: true, paused: true, stopped: true });
    r = stepPrompt(r.state, { now: STOP_PROMPT_MS + 1000, ...riding });
    expect(r.ask).toBe(false);
  });
});
