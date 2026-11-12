import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { offerCardView } from './offerView';

const root = join(__dirname, '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8');

describe('Ride home surfaces', () => {
  it.each([
    [['app', '(tabs)', 'index.tsx'], 'HomeOfferCard'],
    [['app', 'story', '[id].tsx'], 'HomeOfferCard'],
    [['app', 'ride', 'index.tsx'], 'goHome'],
    [['src', 'NavigateChoiceHost.tsx'], 'goHome'],
  ])('%j uses %s', (path, name) => expect(read(...path)).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from '@/features/home/`)));
  it('the card renders nothing without an offer (no React render setup here, so the decision is a pure function)', () => {
    expect(offerCardView({ offer: null })).toBeNull();
    expect(readFileSync(join(__dirname, 'HomeOfferCard.tsx'), 'utf8')).toContain('offerCardView(r)');
    expect(offerCardView({ offer: {}, copy: { title: 'a', body: 'b' } })).toEqual({ title: 'a', body: 'b' });
  });
});
