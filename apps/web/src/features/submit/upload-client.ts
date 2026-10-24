export type UploadKind = "gpx" | "image";
export type UploadOutcome = { status: string; kind?: UploadKind; routeId?: string; mediaId?: string; similar?: { routeId: string; similarity: number }[]; rejectMessage?: string };
export type UploadResult = { ok: true; uploadId: string; outcome: UploadOutcome } | { ok: false; message: string };

const NETWORK = "We couldn't reach the server. Check your connection and try again.";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Browser upload in three steps: ask for a signed target, PUT the bytes to it, then ask the server to process them. */
export async function uploadFile(file: File, kind: UploadKind): Promise<UploadResult> {
  try {
    const req = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, contentType: file.type || "application/octet-stream", sizeBytes: file.size }),
    });
    if (!req.ok) return { ok: false, message: await errorMessage(req, "That file can't be uploaded.") };
    const { uploadId, target } = (await req.json()) as { uploadId: string; target: { url: string; method: string; headers: Record<string, string> } };

    const put = await fetch(target.url, { method: target.method, headers: target.headers, body: file });
    if (!put.ok) return { ok: false, message: "The upload didn't finish. Please try again." };

    const done = await fetch(`/api/uploads/${uploadId}/complete`, { method: "POST" });
    if (!done.ok) return { ok: false, message: await errorMessage(done, "We couldn't process the file.") };
    const outcome = (await done.json()) as UploadOutcome;
    if (outcome.status === "rejected") return { ok: false, message: outcome.rejectMessage ?? "This file was not accepted." };
    if (outcome.status !== "ready") return { ok: false, message: "The file is still being processed. Please try again in a moment." };
    return { ok: true, uploadId, outcome };
  } catch {
    return { ok: false, message: NETWORK };
  }
}
