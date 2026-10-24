import {
  ACCESS_BASES, ACCESS_CLASSES, CONDITION_REASONS, DIFFICULTIES, EVIDENCE_KINDS, HAZARDS, OPERATIONAL_STATUSES,
  RESTRICTIONS, ROUTE_SHAPES, SENSITIVITIES, SUITABILITIES, TERRAINS, VERIFICATION_LEVELS, isValidSlug,
} from "@moto-trails/domain";
import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-08-14");
const point = z.object({ lon: z.number().min(68).max(98), lat: z.number().min(6).max(37) });

const evidence = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  description: z.string().min(1).max(500),
  url: z.string().url().optional(),
});

const access = z.object({
  accessClass: z.enum(ACCESS_CLASSES),
  restrictions: z.array(z.enum(RESTRICTIONS)).default([]),
  permissionInstructions: z.string().max(500).optional(),
  permissionContact: z.string().max(200).optional(),
  basis: z.enum(ACCESS_BASES),
  level: z.enum(VERIFICATION_LEVELS),
  verifiedAt: date.optional(),
  validUntil: date.optional(),
  evidence: z.array(evidence).default([]),
});

const condition = z.object({
  status: z.enum(OPERATIONAL_STATUSES),
  reason: z.enum(CONDITION_REASONS).optional(),
  effectiveFrom: date,
  expectedUntil: date.optional(),
  note: z.string().max(500).optional(),
});

const media = z.object({
  role: z.enum(["cover", "gallery"]),
  position: z.number().int().min(0),
  caption: z.string().max(160).optional(),
  altText: z.string().min(1).max(300),
  credit: z.string().max(120).optional(),
  variants: z.record(z.string(), z.string().refine((u) => u.startsWith("/") || URL.canParse(u), "must be a URL or a site path starting with /")),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const video = z.object({
  position: z.number().int().min(0),
  description: z.string().min(5).max(300),
  caption: z.string().max(160).optional(),
  credit: z.string().max(120).optional(),
  mp4: z.string().refine((u) => u.startsWith("/") || URL.canParse(u), "must be a URL or a site path starting with /"),
  poster: z.string().refine((u) => u.startsWith("/") || URL.canParse(u), "must be a URL or a site path starting with /"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationS: z.number().int().min(1).max(600),
});

export const TrailImportSchema = z
  .object({
    slug: z.string().refine(isValidSlug, "must be a lowercase kebab-case slug up to 80 characters").optional(),
    sample: z.boolean(),
    name: z.string().min(3).max(80),
    summary: z.string().min(40).max(400),
    description: z.string().max(5000).optional(),
    state: z.string().min(1),
    district: z.string().min(1).max(120),
    nearestTown: z.string().min(1).max(120),
    startPoint: point,
    publicPoint: point.optional(),
    sensitivity: z.enum(SENSITIVITIES),
    routeShape: z.enum(ROUTE_SHAPES).optional(),
    distanceKm: z.number().positive().max(5000).optional(),
    estDurationMin: z.number().int().positive().max(10_000).optional(),
    elevationGainM: z.number().int().min(0).max(10_000).optional(),
    difficulty: z.enum(DIFFICULTIES),
    terrain: z.array(z.enum(TERRAINS)).min(1),
    suitableFor: z.array(z.enum(SUITABILITIES)).default([]),
    bestMonths: z.array(z.number().int().min(1).max(12)).default([]),
    seasonNotes: z.string().max(1000).optional(),
    hazards: z.array(z.enum(HAZARDS)).default([]),
    safetyNotes: z.string().max(2000).optional(),
    surfaceNotes: z.string().max(1000).optional(),
    contributorCredit: z.string().min(1).max(120),
    access,
    condition,
    media: z.array(media).default([]),
    videos: z.array(video).default([]),
    /** Path (relative to the import file) of a GPX to attach as the trail's route. */
    gpxFile: z.string().min(1).max(200).optional(),
    publish: z.boolean(),
  })
  .superRefine((t, ctx) => {
    if (t.sensitivity !== "standard" && !t.publicPoint) {
      ctx.addIssue({ code: "custom", path: ["publicPoint"], message: "is required when sensitivity is not standard" });
    }
    if (t.gpxFile && t.sensitivity !== "standard") {
      ctx.addIssue({ code: "custom", path: ["gpxFile"], message: "is not allowed for a sensitive trail" });
    }
    const verified = t.access.level === "officially_verified" || t.access.level === "moderator_verified";
    if (verified) {
      if (!t.access.verifiedAt) ctx.addIssue({ code: "custom", path: ["access", "verifiedAt"], message: "is required for a verified access claim" });
      if (!t.access.validUntil) ctx.addIssue({ code: "custom", path: ["access", "validUntil"], message: "is required for a verified access claim" });
      if (t.access.evidence.length === 0) ctx.addIssue({ code: "custom", path: ["access", "evidence"], message: "needs at least one source for a verified access claim" });
    }
    if (t.access.verifiedAt && t.access.validUntil && t.access.validUntil <= t.access.verifiedAt) {
      ctx.addIssue({ code: "custom", path: ["access", "validUntil"], message: "must be after verifiedAt" });
    }
  });

export type TrailImport = z.infer<typeof TrailImportSchema>;
