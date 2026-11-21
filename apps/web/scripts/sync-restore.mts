// Undoes synced deletes still inside the 30-day recycle bin. Lists what it would restore; changes nothing without --apply.
// Run: npm run sync:restore -w @moto-trails/web -- --email you@example.com --since 2026-11-20T00:00:00Z [--kind ride] [--apply]
// Only deletes made after the server started keeping data have anything to restore (older tombstones are empty and are skipped).
import { createSql } from "../src/server/db/client";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const url = process.env.DATABASE_URL;
const email = arg("email"); const since = arg("since"); const kind = arg("kind");
if (!url || !email || !since || Number.isNaN(Date.parse(since))) {
  console.error("Needs DATABASE_URL, --email and --since <ISO time>");
  process.exit(1);
}
const sql = createSql(url);
try {
  const [u] = await sql`select id from app_user where email = ${email}`;
  if (!u) throw new Error("no such account");
  const where = sql`user_id = ${u.id} and deleted_at >= ${since} and data <> '{}'::jsonb and (${kind ?? null}::text is null or kind = ${kind ?? null})`;
  const rows = await sql`select kind, id, data->>'name' as name, deleted_at, track_key is not null as has_track from sync_record where ${where} order by deleted_at`;
  console.table(rows);
  if (process.argv.includes("--apply") && rows.length) {
    // updated_at is moved to now so the restored copy wins over the old delete on every phone.
    const n = await sql`update sync_record set deleted_at = null, updated_at = now(), synced_at = clock_timestamp(), origin_device = 'restore-script' where ${where} returning id`;
    console.log(`restored ${n.length}`);
  } else console.log(`${rows.length} restorable; add --apply to restore`);
} catch (e) {
  console.error(`failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
