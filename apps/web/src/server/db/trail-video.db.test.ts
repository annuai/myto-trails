import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const addVideo = (revisionId: string, o: Record<string, unknown> = {}) =>
  db.sql`insert into trail_video (revision_id, position, description, mp4_url, poster_url, width, height, duration_s)
    values (${revisionId}, ${(o.position as number) ?? 0}, ${(o.description as string) ?? "A slow pan across the lake shore"}, '/v.mp4', '/p.webp', 1280, 720, ${(o.duration as number) ?? 20}) returning id`;

describe("trail_video", () => {
  it("is closed to anon as a table but readable through the public view for published trails only", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select * from trail_video`)).rejects.toThrow(/permission denied/);
    const pub = await insertTrailFixture(db.sql, {});
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    await addVideo(pub.revisionId);
    await addVideo(draft.revisionId);
    const rows = await asAnon(db.sql, (tx) => tx`select trail_slug, description, mp4_url, duration_s from public_trail_video`);
    expect(rows.map((r) => r.trail_slug)).toEqual([pub.slug]);
    expect(rows[0]).toMatchObject({ mp4_url: "/v.mp4", duration_s: 20 });
  });

  it("requires a description and a sensible duration, and goes with its revision", async () => {
    const t = await insertTrailFixture(db.sql, {});
    await expect(addVideo(t.revisionId, { description: "x" })).rejects.toThrow();
    await expect(addVideo(t.revisionId, { duration: 0 })).rejects.toThrow();
    await expect(addVideo(t.revisionId, { duration: 601 })).rejects.toThrow();
    await addVideo(t.revisionId);
    await db.sql`delete from trail where id = ${t.trailId}`;
    expect(await db.sql`select 1 from trail_video where revision_id = ${t.revisionId}`).toHaveLength(0);
  });
});
