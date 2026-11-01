import { describe, expect, it } from 'vitest';
import { carryFields, carryProblem, parseWater, waterText, womenSafeDisplay } from './trailCarry';

describe('waterText', () => {
  it('says litre or litres per rider', () => {
    expect(waterText(2)).toBe('2 litres of water per rider');
    expect(waterText(1)).toBe('1 litre of water per rider');
    expect(waterText(0.5)).toBe('0.5 litres of water per rider');
  });
});

describe('womenSafeDisplay', () => {
  const ws = (count: number, confirmed = count >= 3, canMark = false) => ({ count, confirmed, mine: false, canMark });
  it('shows nothing for zero marks', () => expect(womenSafeDisplay(ws(0))).toBeNull());
  it('is unconfirmed below three', () => {
    expect(womenSafeDisplay(ws(1))).toEqual({ text: 'Reported safe by 1 woman rider', status: 'unknown' });
    expect(womenSafeDisplay(ws(2))).toEqual({ text: 'Reported safe by 2 women riders', status: 'unknown' });
  });
  it('is confirmed from three', () => expect(womenSafeDisplay(ws(3))).toEqual({ text: 'Safe for women riders', status: 'good' }));
  it('shows nothing when absent', () => expect(womenSafeDisplay(undefined)).toBeNull());
});

describe('parseWater', () => {
  it('reads blank as none and numbers within 0.5 to 20', () => {
    expect(parseWater('')).toEqual({ value: undefined });
    expect(parseWater(' 2.5 ')).toEqual({ value: 2.5 });
    expect(parseWater('0.4')).toEqual({ error: 'Water is between 0.5 and 20 litres.' });
    expect(parseWater('21')).toEqual({ error: 'Water is between 0.5 and 20 litres.' });
    expect(parseWater('lots')).toEqual({ error: 'Water is between 0.5 and 20 litres.' });
  });
});

describe('carryProblem', () => {
  const ok = { water: '', notes: '', arrival: null, arrivalNote: '' };
  it('accepts empty and valid input', () => {
    expect(carryProblem(ok)).toBeUndefined();
    expect(carryProblem({ ...ok, arrival: { from: 360, to: 360 } })).toBeUndefined();
  });
  it('rejects a window that ends before it starts', () => expect(carryProblem({ ...ok, arrival: { from: 600, to: 360 } })).toBe('The best time to reach it must end after it starts.'));
  it('rejects long notes', () => {
    expect(carryProblem({ ...ok, notes: 'x'.repeat(301) })).toBe('Keep the carry note under 300 characters.');
    expect(carryProblem({ ...ok, arrivalNote: 'x'.repeat(201) })).toBe('Keep the best-time note under 200 characters.');
  });
  it('rejects bad water', () => expect(carryProblem({ ...ok, water: '50' })).toBe('Water is between 0.5 and 20 litres.'));
});

describe('carryFields', () => {
  it('sends only what was filled in', () => {
    expect(carryFields({ water: '', items: [], notes: ' ', arrival: null, arrivalNote: '' })).toEqual({});
  });
  it('maps every field to its step 3 key', () => {
    expect(carryFields({ water: '3', items: ['torch'], notes: ' Fill up at the dhaba ', arrival: { from: 360, to: 480 }, arrivalNote: ' Before the heat ' }))
      .toEqual({ waterLitres: 3, carry: ['torch'], carryNotes: 'Fill up at the dhaba', arrivalFromMin: 360, arrivalToMin: 480, arrivalNote: 'Before the heat' });
  });
});
