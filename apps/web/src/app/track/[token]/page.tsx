import type { Metadata } from "next";
import { connection } from "next/server";
import { PinMap } from "@/features/map/PinMap";
import { getSql } from "@/server/db/client";
import { viewCheckin } from "@/server/rides/checkins";

export const instant = false;
// The link is the key to this page: keep it out of search results and out of Referer headers.
export const metadata: Metadata = { title: "Ride check-in", robots: { index: false, follow: false }, referrer: "no-referrer" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function TrackPage({ params }: PageProps<"/track/[token]">) {
  await connection();
  const { token } = await params;
  const v = await viewCheckin(getSql(), token, new Date());
  if (!v.found || v.status === "expired") {
    return (
      <section className="flex max-w-2xl flex-col gap-3 py-(--space-section)">
        <h1 className="display-md">This check-in has ended</h1>
        <p className="max-w-prose text-muted">The link is no longer active. Nothing is kept once a check-in is over.</p>
      </section>
    );
  }
  const overdue = v.status === "overdue";
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-(--space-section)">
      {v.status === "active" ? <meta httpEquiv="refresh" content="60" /> : null}
      {v.status === "arrived" ? (
        <>
          <h1 className="display-md break-words">{v.riderName} has arrived</h1>
          <p className="text-status-good font-medium">Marked safe{v.arrivedAt ? ` at ${when(v.arrivedAt)}` : ""}. You don&apos;t need to do anything.</p>
        </>
      ) : null}
      {v.status === "active" ? (
        <>
          <h1 className="display-md break-words">{v.riderName} is on the way</h1>
          <p className="max-w-prose">Expected by <strong>{when(v.expectedAt)}</strong> (India time){v.rideName ? `, on ${v.rideName}` : ""}. If they haven&apos;t marked themselves safe by then, this page will say so. It refreshes every minute.</p>
        </>
      ) : null}
      {overdue ? (
        <>
          <h1 className="display-md break-words text-status-stop">{v.riderName} hasn&apos;t arrived</h1>
          <p className="max-w-prose">They were expected by <strong>{when(v.expectedAt)}</strong> (India time){v.rideName ? `, on ${v.rideName}` : ""} and haven&apos;t marked themselves safe. Try calling them first. If you can&apos;t reach them and are worried, call 112.</p>
          <a href="tel:112" className="inline-flex min-h-12 w-fit items-center rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Call 112</a>
        </>
      ) : null}
      {v.position ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Last known position</h2>
          <p className="text-sm text-muted">{v.lastSeenAt ? `Seen ${when(v.lastSeenAt)}` : "Time not known"}{v.batteryPct !== null ? `, battery ${v.batteryPct}%` : ""}. The phone may have lost signal since.</p>
          <div className="h-80 w-full border border-border"><PinMap lon={v.position.lng} lat={v.position.lat} label="Last known position" /></div>
          <a href={`https://www.openstreetmap.org/?mlat=${v.position.lat}&mlon=${v.position.lng}#map=15/${v.position.lat}/${v.position.lng}`} className="text-sm underline underline-offset-4" rel="noreferrer">Open on a map</a>
        </div>
      ) : null}
      {v.emergency ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-card-cream p-6">
          <h2 className="text-xl font-semibold">Emergency details</h2>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            {v.emergency.bloodGroup ? <><dt className="text-muted">Blood group</dt><dd className="break-words">{v.emergency.bloodGroup}</dd></> : null}
            {v.emergency.allergies ? <><dt className="text-muted">Allergies</dt><dd className="break-words">{v.emergency.allergies}</dd></> : null}
            {v.emergency.bikeName ? <><dt className="text-muted">Bike</dt><dd className="break-words">{v.emergency.bikeName}</dd></> : null}
          </dl>
        </div>
      ) : null}
      <p className="max-w-prose text-sm text-muted">You are seeing this because {v.riderName} sent you the link from the Myto app. It stops working a day after the ride ends, and nothing is kept after that.</p>
    </section>
  );
}
