import type { Sql } from "postgres";
import { line, makeGpx } from "../gpx/fixtures";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { attachRoute, createDraft, saveStep, submit } from "../submissions/service";

let n = 0;

export async function makeUser(sql: Sql, o: { name?: string; role?: "moderator" | "admin" } = {}): Promise<string> {
  const [u] = await sql`insert into app_user (email, display_name) values (${`fx${++n}-${crypto.randomUUID().slice(0, 6)}@example.test`}, ${o.name ?? "Rider Ravi"}) returning id`;
  if (o.role) {
    // Moderators act within a country; these fixtures are India's.
    await sql`insert into region (kind, name, slug, iso2, enabled) values ('country', 'India', 'india', 'IN', true) on conflict do nothing`;
    const [india] = await sql`select id from region where kind = 'country' and iso2 = 'IN'`;
    await sql`insert into user_role (user_id, role, region_id) values (${u!.id}, ${o.role}, ${o.role === "moderator" ? india!.id : null})`;
  }
  return u!.id as string;
}

/** A complete, submitted (in review) trail submission, as the wizard would produce it. */
export async function submittedSubmission(
  sql: Sql,
  userId: string,
  o: { name?: string; accessClass?: string; restrictions?: string[]; withRoute?: boolean; district?: string; state?: string } = {},
): Promise<{ submissionId: string; slug: string; trailId: string; revisionId: string }> {
  const d = await createDraft(sql, { userId, clientId: crypto.randomUUID() });
  if (!d.ok) throw new Error(d.reason);
  const id = d.id;
  const ok = async (step: 1 | 2 | 3 | 4 | 5 | 6, input: unknown) => {
    const r = await saveStep(sql, { userId, id, step, input });
    if (!r.ok) throw new Error(`step ${step}: ${JSON.stringify(r)}`);
  };
  await ok(1, { name: o.name ?? `Fixture ridge ${++n}`, summary: "A gravel ridge track with long views over the lake, suitable for dual sport bikes in dry weather.", state: o.state ?? "kerala", district: o.district ?? "Wayanad", nearestTown: "Kalpetta" });
  if (o.withRoute) {
    const ingested = ingestGpx(new TextEncoder().encode(makeGpx(line(150, { lat: 11.6, lon: 76.1 }, { ele: (i) => 700 + i }))));
    if (!ingested.ok) throw new Error("fixture gpx");
    const k = ++n;
    const [u] = await sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status) values (${userId}, 'gpx', 'originals', ${`gpx/fx/${k}.gpx`}, 'application/gpx+xml', 100, 'ready') returning id`;
    const { routeId } = await sql.begin((tx) => insertRoute(tx, { ingested, revisionId: null, userId, originalKey: `gpx/fx/${k}.gpx`, cleanKey: `gpx/fx/${k}-c.gpx`, sha256: "f".repeat(64), sizeBytes: 100 }));
    await sql`update upload set route_id = ${routeId} where id = ${u!.id}`;
    await attachRoute(sql, { userId, id, uploadId: u!.id as string });
  }
  await ok(2, { startPoint: { lat: 11.6, lon: 76.1 }, routeShape: "loop" });
  await ok(3, { difficulty: "moderate", terrain: ["gravel"], suitableFor: ["dual_sport"], bestMonths: [11, 12], hazards: [] });
  await ok(4, {
    accessClass: o.accessClass ?? "public",
    restrictions: o.restrictions ?? [],
    permissionInstructions: o.accessClass === "permission_required" ? "Get a pass from the range office in Kalpetta." : "",
    basis: "rider_observed",
    evidence: [{ kind: "other", description: "Open gate and no signage when I rode it in March 2026." }],
  });
  await ok(5, []);
  await ok(6, { safetyNotes: "Carry water.", licenceAccepted: true });
  const r = await submit(sql, { userId, id, now: new Date() });
  if (!r.ok) throw new Error(`submit: ${JSON.stringify(r)}`);
  const [t] = await sql`select t.id as trail_id, s.revision_id from submission s join trail t on t.id = s.trail_id where s.id = ${id}`;
  return { submissionId: id, slug: r.slug, trailId: t!.trail_id as string, revisionId: t!.revision_id as string };
}
