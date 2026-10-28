import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Journal, JournalRide, Pause } from './journal';

type FixRow = { lat: number; lng: number; t: number | null; ele: number | null; speed: number | null; acc: number | null };

let opened: Promise<SQLiteDatabase> | undefined;

/** One connection per JS context. WAL mode lets the background task and the screen use the file at the same time. */
function db(): Promise<SQLiteDatabase> {
  opened ??= (async () => {
    const d = await openDatabaseAsync('myto-ride-journal.db');
    await d.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK (id = 1), started_at INTEGER NOT NULL, source TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS fixes (id INTEGER PRIMARY KEY AUTOINCREMENT, lat REAL NOT NULL, lng REAL NOT NULL, t INTEGER, ele REAL, speed REAL, acc REAL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, t INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS waypoints (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL);
    `);
    return d;
  })();
  return opened;
}

const clearAll = async (d: SQLiteDatabase) => { await d.execAsync('DELETE FROM meta; DELETE FROM fixes; DELETE FROM waypoints; DELETE FROM events;'); };

/** The ride journal on the phone's own storage. Appends are single inserts, so cost does not grow with the ride's length. */
export const journal: Journal = {
  async begin(meta) {
    const d = await db();
    await d.withTransactionAsync(async () => {
      await clearAll(d);
      await d.runAsync('INSERT INTO meta (id, started_at, source) VALUES (1, ?, ?)', meta.startedAt, meta.source);
    });
  },
  async append(f) {
    await (await db()).runAsync('INSERT INTO fixes (lat, lng, t, ele, speed, acc) VALUES (?, ?, ?, ?, ?, ?)', f.lat, f.lng, f.t ?? null, f.ele ?? null, f.speed ?? null, f.acc ?? null);
  },
  async appendWaypoint(w) {
    await (await db()).runAsync('INSERT INTO waypoints (name, lat, lng) VALUES (?, ?, ?)', w.name, w.lat, w.lng);
  },
  async pause(t) {
    const d = await db();
    const last = await d.getFirstAsync<{ kind: string }>('SELECT kind FROM events ORDER BY id DESC LIMIT 1');
    if (last?.kind !== 'pause') await d.runAsync("INSERT INTO events (kind, t) VALUES ('pause', ?)", t);
  },
  async resume(t) {
    const d = await db();
    const last = await d.getFirstAsync<{ kind: string }>('SELECT kind FROM events ORDER BY id DESC LIMIT 1');
    if (last?.kind === 'pause') await d.runAsync("INSERT INTO events (kind, t) VALUES ('resume', ?)", t);
  },
  async read(): Promise<JournalRide | null> {
    const d = await db();
    const meta = await d.getFirstAsync<{ started_at: number; source: 'gps' | 'sim' }>('SELECT started_at, source FROM meta WHERE id = 1');
    if (!meta) return null;
    const rows = await d.getAllAsync<FixRow>('SELECT lat, lng, t, ele, speed, acc FROM fixes ORDER BY id');
    const waypoints = await d.getAllAsync<{ name: string; lat: number; lng: number }>('SELECT name, lat, lng FROM waypoints ORDER BY id');
    const events = await d.getAllAsync<{ kind: string; t: number }>('SELECT kind, t FROM events ORDER BY id');
    const pauses: Pause[] = [];
    for (const e of events) { if (e.kind === 'pause') pauses.push({ from: e.t }); else if (pauses.length) pauses[pauses.length - 1].to = e.t; }
    return {
      meta: { startedAt: meta.started_at, source: meta.source },
      points: rows.map((r) => ({ lat: r.lat, lng: r.lng, ...(r.t != null ? { t: r.t } : {}), ...(r.ele != null ? { ele: r.ele } : {}), ...(r.speed != null ? { speed: r.speed } : {}), ...(r.acc != null ? { acc: r.acc } : {}) })),
      waypoints, pauses,
    };
  },
  async clear() { await clearAll(await db()); },
};
