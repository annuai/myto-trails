import { openDatabaseAsync } from 'expo-sqlite';
import type { LatLng } from '../geo';
import type { Place } from '../placeSearch';
import type { Installed } from './manifest';
import { ftsQuery, rowToPlace, splitPath, type PlaceRow } from './searchIndex';

type Hit = PlaceRow & { rank: number; score: number };

// Best rank first, then FTS5 relevance (bm25 is lower-is-better). With `near`, squared degree distance breaks remaining ties, done in SQL.
const SQL = (near: boolean) => `SELECT p.name, p.detail, p.lat, p.lng, p.rank, bm25(places_fts) AS score
  FROM places_fts JOIN places p ON p.id = places_fts.rowid
  WHERE places_fts MATCH ?
  ORDER BY p.rank DESC, bm25(places_fts)${near ? ', ((p.lat - ?) * (p.lat - ?) + (p.lng - ?) * (p.lng - ?))' : ''}
  LIMIT ?`;

/** Searches the installed regions' search files. A region whose file is missing or corrupt is skipped. Each file is opened, queried and closed. */
export async function searchLocal(text: string, installed: Installed[], near?: LatLng, limit = 6): Promise<Place[]> {
  const match = ftsQuery(text);
  if (!match) return [];
  const hits: Hit[] = [];
  for (const region of installed) {
    try {
      const { dir, file } = splitPath(region.searchPath);
      // The installed expo-sqlite has no read-only open option; this code only ever runs SELECTs.
      const db = await openDatabaseAsync(file, { useNewConnection: true }, dir);
      try {
        const args: (string | number)[] = [match];
        if (near) args.push(near.lat, near.lat, near.lng, near.lng);
        args.push(limit);
        hits.push(...(await db.getAllAsync<Hit>(SQL(!!near), args)));
      } finally {
        await db.closeAsync().catch(() => undefined);
      }
    } catch {
      // missing or corrupt file: this region simply has no results
    }
  }
  hits.sort((a, b) => b.rank - a.rank || a.score - b.score);
  return hits.slice(0, limit).map(rowToPlace);
}
