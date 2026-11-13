import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isRoutableQuickLink, QUICK_LINKS, quickWidgetProps } from './quickWidget';

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

const appDir = join(__dirname, '../../app');
/** Every screen file under app/ as a route path: `/ride`, `/ride/live`, `/documents/contacts` (groups and index dropped). */
function routes(dir = appDir, base = ''): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) return routes(full, f.startsWith('(') ? base : `${base}/${f}`);
    const name = f.replace(/\.tsx?$/, '');
    return name === 'index' ? [base || '/'] : name.startsWith('_') ? [] : [`${base}/${name}`];
  });
}

describe('widget links', () => {
  it('every QUICK_LINKS target is a real screen (an unmatched route shows "Unmatched Route")', () => {
    for (const url of Object.values(QUICK_LINKS)) expect(isRoutableQuickLink(url, routes()), url).toBe(true);
  });
  it('rejects a docs path like the one iOS opens for a widget without containerBackground', () => {
    expect(isRoutableQuickLink('myto:///documentation/widgetkit/preparing-widgets-for-additional-contexts-and-appearances', routes())).toBe(false);
  });
  it('the widget bodies only link to QUICK_LINKS and the iOS one sets containerBackground', () => {
    const dir = join(__dirname, '../features/widgets');
    for (const f of ['QuickActions.ios.tokens.tsx', 'QuickActions.android.tokens.tsx']) {
      const src = readFileSync(join(dir, f), 'utf8');
      const urls = src.match(/myto:\/\/[^'"`\s)]+/g) ?? [];
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) expect(Object.values(QUICK_LINKS), `${f}: ${u}`).toContain(u);
    }
    expect(readFileSync(join(dir, 'QuickActions.ios.tokens.tsx'), 'utf8')).toContain("containerBackground(");
  });
});
