import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@/server/db/client";
import { listReports } from "@/server/moderation/reports";
import { requireModerator } from "@/server/moderation/session";
import { resolveReportAction } from "../actions";

export const instant = false;
export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };
const input = "min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3";

export default async function ReportsPage({ searchParams }: PageProps<"/moderate/reports">) {
  const actor = await requireModerator("/moderate/reports");
  const r = await listReports(getSql(), actor.id);
  const sp = await searchParams;
  const items = r.ok ? r.items : [];
  return (
    <section className="flex max-w-3xl flex-col gap-6 py-8">
      <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
      <h1 className="text-3xl font-semibold leading-tight">Reports ({items.length})</h1>
      {sp.result === "saved" ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">Saved.</p> : typeof sp.result === "string" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">That did not go through: {sp.result.replaceAll("_", " ")}.</p> : null}
      {items.length === 0 ? <p className="text-muted">No open reports.</p> : (
        <ul className="flex flex-col gap-6">
          {items.map((i) => (
            <li key={i.reportId} className="flex flex-col gap-3 border border-border p-4">
              <p className="font-medium"><Link href={`/moderate/trails/${i.trailSlug}`} className="underline underline-offset-4">{i.trailName}</Link> · {i.type.replaceAll("_", " ")}{i.priority === "high" ? " · HIGH PRIORITY" : ""}</p>
              <p className="whitespace-pre-line">{i.details}</p>
              <p className="text-sm text-muted">From {i.reporterName} · {i.status.replaceAll("_", " ")} · {new Date(i.createdAt).toLocaleDateString("en-GB")}</p>
              <form action={resolveReportAction} className="flex flex-col gap-3">
                <input type="hidden" name="reportId" value={i.reportId} />
                <label className="text-sm font-medium" htmlFor={`o-${i.reportId}`}>Outcome</label>
                <select id={`o-${i.reportId}`} name="outcome" className={input}>
                  <option value="accepted">Accepted</option><option value="rejected">Could not confirm</option><option value="needs_info">Need more information</option><option value="duplicate">Duplicate of another report</option>
                </select>
                <label className="text-sm font-medium" htmlFor={`n-${i.reportId}`}>Note to the reporter (optional)</label>
                <input id={`n-${i.reportId}`} name="note" maxLength={2000} className={input} />
                {i.type === "closure" ? (
                  <>
                    <label className="text-sm font-medium" htmlFor={`c-${i.reportId}`}>If accepted, set condition</label>
                    <select id={`c-${i.reportId}`} name="conditionStatus" className={input}><option value="">Leave as is</option><option value="temporarily_closed">Temporarily closed</option><option value="permanently_closed">Permanently closed</option><option value="open">Open</option></select>
                    <label className="text-sm font-medium" htmlFor={`e-${i.reportId}`}>Expected until (optional)</label>
                    <input id={`e-${i.reportId}`} name="expectedUntil" placeholder="2026-12-01" className={input} />
                  </>
                ) : null}
                <button type="submit" className="min-h-12 self-start rounded-lg border border-foreground px-5 text-sm font-medium">Record outcome</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
