import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useOnChange } from './useOnChange';

describe('useOnChange', () => {
  const calls: string[] = [];
  const probe = (value: string, onFirstDraw: boolean) => {
    function P() { useOnChange(value, (v) => calls.push(v), { onFirstDraw }); return null; }
    return renderToStaticMarkup(createElement(P));
  };
  it('does not run on the first draw by default', () => {
    calls.length = 0; probe('a', false);
    expect(calls).toEqual([]);
  });
  it('runs on the first draw when asked', () => {
    calls.length = 0; probe('a', true);
    expect(calls).toEqual(['a']);
  });
});
