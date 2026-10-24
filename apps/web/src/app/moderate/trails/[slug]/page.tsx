import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSql } from "@/server/db/client";
import { getTrailForModeration } from "@/server/moderation/access";
import { requireModerator } from "@/server/moderation/session";
import { trailActionAction } from "../../actions";

export const instant = false;
export const metadata: Metadata = { title: "Trail controls", robots: { index: false, follow: false } };

const input = "min-h-12 w-full rounded-sm border border-foreground/40 bg-background px-3";
const box = "flex flex-col gap-3 border border-border p-4";
const btn = "min-h-12 self-start rounded-md border border-foreground px-5 text-sm font-medium";

export default async function TrailControls({ params, searchParams }: PageProps<"/moderate/trails/[slug]">) {
  const { slug } = await params;
  const actor = await requireModerator(`/moderate/trails/${slug}`);
  const r = await getTrailForModeration(getSql(), actor.id, slug);
  if (!r.ok) notFound();
  const t = r.trail;
  const sp = await searchParams;
  const hidden = (<><input type="hidden" name="slug" value={t.slug} /><input type="hidden" name="trailId" value={t.trailId} /></>);

  return (
    <section className="flex max-w-2xl flex-col gap-8 py-8">
      <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
      <h1 className="text-3xl font-semibold leading-tight">{t.name}</h1>
      <p className="text-muted">{t.lifecycle} · access {t.accessClass.replaceAll("_", " ")} · {t.level.replaceAll("_", " ")}{t.validUntil ? ` until ${t.validUntil}` : ""} · condition {t.condition.replaceAll("_", " ")} · {t.evidenceCount} source(s){t.permissionContact ? ` · contact: ${t.permissionContact}` : ""}</p>
      {sp.result === "saved" ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">Saved.</p> : typeof sp.result === "string" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">That did not go through: {sp.result.replaceAll("_", " ")}.</p> : null}

      <form action={trailActionAction} className={box}>
        {hidden}
        <h2 className="text-xl font-semibold">Verify access</h2>
        <label className="text-sm font-medium" htmlFor="level">Level</label>
        <select id="level" name="level" className={input}><option value="moderator_verified">Moderator verified</option><option value="officially_verified">Officially verified (document and authority needed)</option></select>
        <label className="text-sm font-medium" htmlFor="evidenceKind">New source</label>
        <select id="evidenceKind" name="evidenceKind" className={input}>
          {["call_note", "written_confirmation", "official_document", "signage_photo", "url", "other"].map((k) => <option key={k} value={k}>{k.replaceAll("_", " ")}</option>)}
        </select>
        <label className="text-sm font-medium" htmlFor="evidenceDescription">What you did or saw (how you verified)</label>
        <input id="evidenceDescription" name="evidenceDescription" maxLength={500} className={input} />
        <label className="text-sm font-medium" htmlFor="evidenceUrl">Link (optional)</label>
        <input id="evidenceUrl" name="evidenceUrl" className={input} />
        <label className="text-sm font-medium" htmlFor="authority">Authority name (official verification)</label>
        <input id="authority" name="authority" maxLength={200} className={input} />
        <label className="text-sm font-medium" htmlFor="validUntil">Valid until (optional, default by access type)</label>
        <input id="validUntil" name="validUntil" placeholder="2027-06-01" className={input} />
        <button type="submit" name="intent" value="verify" className={btn}>Record verification</button>
      </form>

      <form action={trailActionAction} className={box}>
        {hidden}
        <h2 className="text-xl font-semibold">Set condition</h2>
        <label className="text-sm font-medium" htmlFor="status">Status</label>
        <select id="status" name="status" className={input}>{["open", "temporarily_closed", "permanently_closed", "seasonal", "unknown"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>
        <label className="text-sm font-medium" htmlFor="reason">Reason (optional)</label>
        <select id="reason" name="reason" className={input}><option value="">None</option>{["weather", "landslide", "construction", "private_closure", "regulatory", "unknown", "other"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>
        <label className="text-sm font-medium" htmlFor="expectedUntil">Expected until (optional)</label>
        <input id="expectedUntil" name="expectedUntil" placeholder="2026-12-01" className={input} />
        <label className="text-sm font-medium" htmlFor="note">Note shown to riders (optional)</label>
        <input id="note" name="note" maxLength={500} className={input} />
        <button type="submit" name="intent" value="condition" className={btn}>Save condition</button>
      </form>

      {t.lifecycle === "published" ? (
        <form action={trailActionAction} className={box}>
          {hidden}
          <h2 className="text-xl font-semibold">Unpublish</h2>
          <p className="text-sm text-muted">Use when an owner or authority asks for removal. The trail disappears from the site at once; history is kept.</p>
          <label className="text-sm font-medium" htmlFor="unpublish-reason">Reason</label>
          <input id="unpublish-reason" name="reason" maxLength={1000} required className={input} />
          <button type="submit" name="intent" value="unpublish" className={`${btn} border-status-stop text-status-stop`}>Unpublish this trail</button>
        </form>
      ) : null}
    </section>
  );
}
