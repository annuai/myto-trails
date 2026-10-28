import { isValidSlug } from "@moto-trails/domain";
import { parseSearchParams } from "@/features/discovery/search-params";
import { withPublicRole } from "../db/client";
import { buildGpxExport } from "../gpx/export";
import { listSaved, saveTrail, unsaveTrail } from "../queries/saved";
import { createReport } from "../queries/reports";
import { searchTrails } from "../queries/search.sql";
import { queryTrailBySlug, queryTrailMedia, queryTrailRoute } from "../queries/trails.sql";
import { STEPS, validateStep, type Step } from "../submissions/schema";
import { attachRoute, createDraft, getMine, listMine, saveStep, submit } from "../submissions/service";
import { completeUpload, getUploadStatus, requestUpload } from "../uploads/service";
import { exchangeAppCode } from "../auth/app-auth";
import { listBikeMakes, listBikeModels } from "../community/bikes";
import { getClub, listClubs, listMembers, setClubCover } from "../community/clubs";
import { getAvatarUrl, getBike, removeBike, saveBike, setAvatar } from "../community/profile";
import { revokeToken } from "./tokens";
import { ApiError, fail, ok, type Ctx, type RouteDef } from "./http";
import { clientIp, hashIp } from "../auth/request-context";

const SLUG_ERR = () => new ApiError(404, "not_found", "No such trail.");
const slugOf = (c: Ctx) => {
  const s = c.params.slug!;
  if (!isValidSlug(s)) throw SLUG_ERR();
  return s;
};
const asObject = async (c: Ctx): Promise<Record<string, unknown>> => {
  const b = await c.body();
  if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "invalid_request", "The body must be a JSON object.");
  return b as Record<string, unknown>;
};
const mediaIdOf = (v: unknown, field = "mediaId"): string | null => {
  if (v === null) return null;
  if (typeof v !== "string") throw new ApiError(400, "invalid_request", `${field} must be a string or null.`);
  return v;
};
/** Public reference data that changes rarely: caches at the edge for an hour and may be served stale for a day. */
const cacheable = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } });
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function searchRaw(url: URL) {
  const raw: Record<string, string | string[]> = Object.create(null);
  for (const k of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(k);
    raw[k] = all.length > 1 ? all : all[0]!;
  }
  return raw;
}
const num = (v: string | null) => (v === null || v.trim() === "" ? undefined : Number.isFinite(Number(v)) ? Number(v) : undefined);

export const routes: RouteDef[] = [
  {
    method: "GET", path: "/openapi.json", access: "public", summary: "This description of the API",
    handler: async () => ok((await import("./openapi")).buildOpenApi(routes)),
  },
  {
    method: "GET", path: "/trails", access: "public", summary: "Search published trails (query: q, near, radius, state, terrain, difficulty, access, page, ...; lat and lon give your own position when near=me)",
    async handler(c) {
      const p = parseSearchParams(searchRaw(c.url));
      const lat = num(c.url.searchParams.get("lat"));
      const lon = num(c.url.searchParams.get("lon"));
      const point = lat !== undefined && lon !== undefined ? { lat, lon } : undefined;
      return ok(await withPublicRole(c.sql, (tx) => searchTrails(tx, p, c.now, { point })));
    },
  },
  {
    method: "GET", path: "/trails/{slug}", access: "public", summary: "One published trail, with its photos (media: role, position, caption, altText, credit, variants by pixel width)",
    async handler(c) {
      const slug = slugOf(c);
      const t = await withPublicRole(c.sql, (tx) => queryTrailBySlug(tx, slug, c.now));
      if (!t) return fail(404, "not_found", "No such trail.");
      const media = await withPublicRole(c.sql, (tx) => queryTrailMedia(tx, slug));
      return ok({ ...t, media });
    },
  },
  {
    method: "GET", path: "/trails/{slug}/route", access: "public", summary: "Simplified route line, statistics and elevation profile (standard-sensitivity trails only)",
    async handler(c) {
      const r = await withPublicRole(c.sql, (tx) => queryTrailRoute(tx, slugOf(c)));
      return r ? ok(r) : fail(404, "not_found", "No route is published for this trail.");
    },
  },
  {
    method: "GET", path: "/trails/{slug}/gpx", access: "public", summary: "GPX download (same rules as the website)",
    async handler(c) {
      const r = await buildGpxExport({ sql: c.sql, storage: c.storage, slug: slugOf(c), now: c.now, siteUrl: c.siteUrl, ipHash: hashIp(clientIp(c.req.headers)) });
      if (r.ok) return new Response(r.xml, { headers: { "Content-Type": "application/gpx+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${r.filename}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
      const map = { not_found: 404, not_published: 404, no_gpx: 404, rate_limited: 429, unavailable: 503, sensitive_area: 403, access_not_allowed: 403, permanently_closed: 403 } as const;
      return fail(map[r.reason], r.reason, "A GPX is not available for this trail.");
    },
  },
  {
    method: "POST", path: "/trails/{slug}/reports", access: "write:submission", summary: "Report a problem with a trail (body: type, details)",
    async handler(c) {
      const b = await asObject(c);
      const r = await createReport(c.sql, { userId: c.userId, slug: slugOf(c), type: String(b.type ?? ""), details: String(b.details ?? "") });
      if (r.ok) return ok({ reference: r.ref }, 201);
      if (r.reason === "not_found") return fail(404, "not_found", "No such trail.");
      if (r.reason === "rate_limited") return fail(429, "rate_limited", "Too many reports today.");
      return fail(422, "validation_failed", "Check the type and describe the problem in at least 20 characters.");
    },
  },

  {
    method: "POST", path: "/auth/token", access: "public", summary: "Trade a one-time code from the website's app sign-in for a device token (body: code, verifier, kind app_android|app_ios; PKCE S256)",
    async handler(c) {
      const b = await asObject(c);
      const r = await exchangeAppCode(c.sql, { code: String(b.code ?? ""), verifier: String(b.verifier ?? ""), kind: String(b.kind ?? "") });
      if (r.ok) return ok({ token: r.token, scopes: ["saved", "write:submission"] }, 201);
      if (r.reason === "too_many_tokens") return fail(409, "too_many_tokens", "This account has too many connected devices. Remove one under Account, Connected devices.");
      return r.reason === "invalid_request" ? fail(400, "invalid_request", "Send code, verifier and kind.") : fail(400, "invalid_grant", "The code is invalid, expired or already used.");
    },
  },
  {
    method: "DELETE", path: "/auth/token", access: "token", summary: "Sign out: revoke the token used for this request",
    async handler(c) {
      await revokeToken(c.sql, { userId: c.userId, tokenId: c.auth!.tokenId });
      return noContent();
    },
  },
  {
    method: "GET", path: "/bikes", access: "public", summary: "The bike catalogue (query: q, make, category, page; only models that have a picture, unless all=1)",
    async handler(c) {
      const p = c.url.searchParams;
      return cacheable(await listBikeModels(c.sql, { q: p.get("q") ?? undefined, make: p.get("make") ?? undefined, category: p.get("category") ?? undefined, page: num(p.get("page")), all: p.get("all") === "1" }));
    },
  },
  {
    method: "GET", path: "/bikes/makes", access: "public", summary: "Bike makes with their model counts (all=1 counts models without a picture too)",
    async handler(c) {
      return cacheable(await listBikeMakes(c.sql, { all: c.url.searchParams.get("all") === "1" }));
    },
  },
  {
    method: "GET", path: "/me", access: "token", summary: "Who the token belongs to",
    async handler(c) {
      const [u] = await c.sql`select display_name, email from app_user where id = ${c.userId}`;
      return ok({ displayName: u?.display_name ?? "", email: u?.email ?? "", scopes: c.auth!.scopes, avatarUrl: await getAvatarUrl(c.sql, c.userId), bike: await getBike(c.sql, c.userId) });
    },
  },

  {
    method: "GET", path: "/me/saved", access: "saved", summary: "The token owner's Saved trails with changes since they last looked",
    async handler(c) {
      return ok({ items: await listSaved(c.sql, c.userId, c.now) });
    },
  },
  {
    method: "PUT", path: "/me/saved/{slug}", access: "saved", summary: "Save a trail",
    async handler(c) {
      const r = await saveTrail(c.sql, c.userId, slugOf(c), c.now);
      return r.saved ? noContent() : fail(404, "not_found", "No such trail.");
    },
  },
  {
    method: "DELETE", path: "/me/saved/{slug}", access: "saved", summary: "Remove a trail from Saved",
    async handler(c) {
      await unsaveTrail(c.sql, c.userId, slugOf(c));
      return noContent();
    },
  },
  {
    method: "GET", path: "/sync", access: "saved", summary: "Saved trails changed since a time (query: since, ISO 8601), and ones no longer available",
    async handler(c) {
      const raw = c.url.searchParams.get("since") ?? "";
      const since = new Date(raw);
      if (!raw || Number.isNaN(since.getTime())) throw new ApiError(400, "invalid_request", "since must be an ISO 8601 time, for example 2026-06-01T00:00:00Z.");
      const items = await listSaved(c.sql, c.userId, c.now);
      return ok({
        serverTime: c.now.toISOString(),
        changed: items.filter((i) => i.trail && (new Date(i.trail.updatedAt) > since || new Date(i.addedAt) > since || i.changes.length > 0)).map((i) => i.trail),
        removed: items.filter((i) => i.unavailableId).map((i) => i.unavailableId),
      });
    },
  },

  {
    method: "POST", path: "/uploads", access: "write:submission", summary: "Ask for a signed upload URL (body: kind gpx|image, contentType, sizeBytes)",
    async handler(c) {
      const b = await asObject(c);
      if ((b.kind !== "gpx" && b.kind !== "image") || typeof b.contentType !== "string" || typeof b.sizeBytes !== "number") throw new ApiError(400, "invalid_request", "Send kind, contentType and sizeBytes.");
      const r = await requestUpload(c.sql, c.storage, { userId: c.userId, kind: b.kind, contentType: b.contentType, sizeBytes: b.sizeBytes });
      if (r.ok) return ok({ uploadId: r.uploadId, target: r.target, contentType: r.contentType }, 201);
      return r.reason === "rate_limited" ? fail(429, "rate_limited", "Too many uploads. Try again later.") : fail(400, "invalid_request", "That file type or size is not allowed.");
    },
  },
  {
    method: "POST", path: "/uploads/{id}/complete", access: "write:submission", summary: "Process an uploaded file",
    async handler(c) {
      const r = await completeUpload(c.sql, c.storage, { userId: c.userId, uploadId: c.params.id! });
      return r.status === "not_found" ? fail(404, "not_found", "No such upload.") : ok(r);
    },
  },
  {
    method: "GET", path: "/uploads/{id}", access: "write:submission", summary: "Status of an upload",
    async handler(c) {
      const r = await getUploadStatus(c.sql, c.userId, c.params.id!);
      return r.status === "not_found" ? fail(404, "not_found", "No such upload.") : ok(r);
    },
  },

  {
    method: "GET", path: "/me/submissions", access: "write:submission", summary: "The token owner's submissions",
    async handler(c) {
      return ok({ items: await listMine(c.sql, c.userId) });
    },
  },
  {
    method: "POST", path: "/submissions", access: "write:submission", summary: "Create a draft (body: clientId, a UUID; repeating it returns the same draft)",
    async handler(c) {
      const b = await asObject(c);
      const r = await createDraft(c.sql, { userId: c.userId, clientId: String(b.clientId ?? "") });
      if (r.ok) return ok({ id: r.id }, 201);
      return r.reason === "too_many_drafts" ? fail(409, "too_many_drafts", "Finish or delete an open draft first.") : fail(400, "invalid_request", "clientId must be a UUID.");
    },
  },
  {
    method: "GET", path: "/submissions/{id}", access: "write:submission", summary: "A submission with its status and moderator feedback",
    async handler(c) {
      const s = await getMine(c.sql, c.userId, c.params.id!);
      return s ? ok(s) : fail(404, "not_found", "No such submission.");
    },
  },
  {
    method: "PUT", path: "/submissions/{id}/steps/{step}", access: "write:submission", summary: "Save one step (1 basics, 2 route, 3 details, 4 access, 5 photos, 6 review)",
    async handler(c) {
      const step = Number(c.params.step);
      if (!(STEPS as readonly number[]).includes(step)) throw new ApiError(404, "not_found", "No such step.");
      const r = await saveStep(c.sql, { userId: c.userId, id: c.params.id!, step: step as Step, input: await c.body() });
      if (r.ok) return ok({ ok: true });
      if ("errors" in r) return fail(422, "validation_failed", "Some fields need attention.", { fields: r.errors });
      const map = { not_found: [404, "No such submission."], locked: [409, "This submission can no longer be edited."], too_large: [413, "That is too much data for one step."], invalid: [400, "The body has the wrong shape for this step."] } as const;
      return fail(map[r.reason][0], r.reason, map[r.reason][1]);
    },
  },
  {
    method: "POST", path: "/submissions/{id}/route", access: "write:submission", summary: "Attach a processed GPX upload (body: uploadId)",
    async handler(c) {
      const b = await asObject(c);
      const r = await attachRoute(c.sql, { userId: c.userId, id: c.params.id!, uploadId: String(b.uploadId ?? "") });
      if (r.ok) return ok({ duplicates: r.duplicates });
      return r.reason === "locked" ? fail(409, "locked", "This submission can no longer be edited.") : fail(404, "not_found", "No such submission or upload.");
    },
  },
  {
    method: "POST", path: "/submissions/{id}/submit", access: "write:submission", summary: "Submit a complete draft for review",
    async handler(c) {
      const r = await submit(c.sql, { userId: c.userId, id: c.params.id!, now: c.now });
      if (r.ok) return ok({ slug: r.slug });
      if (r.reason === "invalid") return fail(422, "validation_failed", "Some steps are incomplete.", { steps: r.steps });
      const map = { not_found: [404, "No such submission."], locked: [409, "This submission cannot be submitted now."], rate_limited: [429, "Too many submissions today."], photo_unavailable: [409, "A photo or the route is no longer available."] } as const;
      return fail(map[r.reason][0], r.reason, map[r.reason][1]);
    },
  },

  {
    method: "PUT", path: "/me/avatar", access: "write:submission", summary: "Set your profile picture (body: mediaId from a completed image upload, or null to remove it)",
    async handler(c) {
      const b = await asObject(c);
      const r = await setAvatar(c.sql, { userId: c.userId, mediaId: mediaIdOf(b.mediaId) });
      if (!r.ok) return fail(422, "invalid_media", "That photo is not one of your uploads.");
      return ok({ avatarUrl: await getAvatarUrl(c.sql, c.userId) });
    },
  },
  {
    method: "PUT", path: "/me/bike", access: "write:submission", summary: "Set your bike, shown to your club members (body: name, modelYear, bikeModelId from GET /bikes, photoMediaId; leave bikeModelId or photoMediaId out to keep it, null to remove it)",
    async handler(c) {
      const b = await asObject(c);
      const r = await saveBike(c.sql, { userId: c.userId, name: b.name, modelYear: b.modelYear, photoMediaId: "photoMediaId" in b ? mediaIdOf(b.photoMediaId) : undefined, bikeModelId: "bikeModelId" in b ? mediaIdOf(b.bikeModelId, "bikeModelId") : undefined });
      if (!r.ok) return fail(422, "validation_failed", "Give the bike a name (2 to 60 characters), a model year between 1900 and 2100 or none, a bike from the catalogue, and a photo you uploaded.");
      return ok(await getBike(c.sql, c.userId));
    },
  },
  {
    method: "DELETE", path: "/me/bike", access: "write:submission", summary: "Remove your bike",
    async handler(c) {
      await removeBike(c.sql, c.userId);
      return noContent();
    },
  },
  {
    method: "GET", path: "/clubs", access: "token", summary: "Every club, with your role in each. Empty until you have finished the website's welcome step",
    async handler(c) {
      return ok({ items: await listClubs(c.sql, c.userId) });
    },
  },
  {
    method: "GET", path: "/clubs/{id}", access: "token", summary: "One club. Members also get the member list with avatars and bikes (club members only)",
    async handler(c) {
      const club = await getClub(c.sql, { userId: c.userId, clubId: c.params.id! });
      if (!club) return fail(404, "not_found", "No such club.");
      return ok({ club, members: club.role ? await listMembers(c.sql, { userId: c.userId, clubId: c.params.id! }) : null });
    },
  },
  {
    method: "PUT", path: "/clubs/{id}/cover", access: "write:submission", summary: "Set the club's cover image, club admins only (body: mediaId from a completed image upload, or null for the placeholder)",
    async handler(c) {
      const b = await asObject(c);
      const r = await setClubCover(c.sql, { userId: c.userId, clubId: c.params.id!, mediaId: mediaIdOf(b.mediaId) });
      if (r.ok) return ok({ coverUrl: (await getClub(c.sql, { userId: c.userId, clubId: c.params.id! }))?.coverUrl ?? null });
      const map = { not_found: [404, "No such club."], not_admin: [403, "Only club admins can change the cover."], invalid: [422, "That photo is not one of your uploads."] } as const;
      return fail(map[r.reason][0], r.reason, map[r.reason][1]);
    },
  },
];

// validateStep is re-exported so contract tests and clients can reuse the exact field rules.
export { validateStep };
