import type { Step } from "@/server/submissions/schema";

const MAX_ROWS = 20;
const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};
const many = (f: FormData, k: string) => f.getAll(k).filter((v): v is string => typeof v === "string");
const num = (f: FormData, k: string) => {
  const raw = text(f, k).trim();
  const n = raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Turns a posted step form into the raw object its schema validates. Types are coerced here, nothing is
 * validated: blanks and junk become undefined or empty so the schema can say what is wrong.
 */
export function parseStepForm(step: Step, f: FormData): Record<string, unknown> | unknown[] {
  switch (step) {
    case 1:
      return { name: text(f, "name"), summary: text(f, "summary"), state: text(f, "state"), district: text(f, "district"), nearestTown: text(f, "nearestTown") };
    case 2: {
      const lat = num(f, "lat");
      const lon = num(f, "lon");
      return { startPoint: lat === undefined || lon === undefined ? undefined : { lat, lon }, routeShape: text(f, "routeShape") || undefined };
    }
    case 3:
      return {
        difficulty: text(f, "difficulty") || undefined,
        terrain: many(f, "terrain"),
        suitableFor: many(f, "suitableFor"),
        bestMonths: many(f, "bestMonths").map(Number),
        hazards: many(f, "hazards"),
        seasonNotes: text(f, "seasonNotes"),
        surfaceNotes: text(f, "surfaceNotes"),
        description: text(f, "description"),
      };
    case 4: {
      const evidence: { kind: string; description: string; url: string }[] = [];
      for (let i = 0; i < MAX_ROWS; i++) {
        const description = text(f, `evidenceDescription_${i}`);
        const url = text(f, `evidenceUrl_${i}`);
        if (!description.trim() && !url.trim()) continue;
        evidence.push({ kind: text(f, `evidenceKind_${i}`), description, url });
      }
      return {
        accessClass: text(f, "accessClass") || undefined,
        restrictions: many(f, "restrictions"),
        permissionInstructions: text(f, "permissionInstructions"),
        permissionContact: text(f, "permissionContact"),
        basis: text(f, "basis") || undefined,
        evidence,
      };
    }
    case 5: {
      const photos: { mediaId: string; altText: string; caption: string; credit: string }[] = [];
      for (let i = 0; i < MAX_ROWS; i++) {
        const mediaId = text(f, `photoId_${i}`);
        if (!mediaId) continue;
        photos.push({ mediaId, altText: text(f, `photoAlt_${i}`), caption: text(f, `photoCaption_${i}`), credit: text(f, `photoCredit_${i}`) });
      }
      return photos;
    }
    case 6:
      return { safetyNotes: text(f, "safetyNotes"), contributorNote: text(f, "contributorNote"), licenceAccepted: f.get("licenceAccepted") === "on" };
  }
}
