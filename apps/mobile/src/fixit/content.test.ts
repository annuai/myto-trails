import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXIT_ART_ALT } from '@moto-trails/domain/fixit-seed';

describe('pictures', () => {
  it('are all named in the brief for whoever draws them, so none is forgotten', () => {
    const brief = readFileSync(join(__dirname, '../../assets/fixit/README.md'), 'utf8');
    for (const id of Object.keys(FIXIT_ART_ALT)) expect(brief.includes(`\`${id}\``), id).toBe(true);
  });
});
