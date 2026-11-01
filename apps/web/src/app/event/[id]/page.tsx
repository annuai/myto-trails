import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAppDownloadUrl } from "@/lib/site";
import { formatWhen } from "@/lib/time-zone";
import { getPublicEvent } from "@/server/community/events";
import { getSql } from "@/server/db/client";

export const instant = false;
// Only open events show here, and only their name, time, place and head count. Keep the page out of search results and Referer headers.
export const metadata: Metadata = { title: "Ride event", robots: { index: false, follow: false }, referrer: "no-referrer" };

const button = "inline-flex min-h-12 w-fit items-center rounded-lg px-5 text-sm font-medium";

/** What a shared event link opens: the ride's details and a button into the app, where riders reply and check in. */
export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  await connection();
  const { id } = await params;
  const ev = await getPublicEvent(getSql(), decodeURIComponent(id), new Date());
  if (!ev) notFound();
  const download = getAppDownloadUrl(process.env);
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-(--space-section)">
      <div className="flex flex-col gap-2">
        <h1 className="display-md">{ev.title}</h1>
        {ev.clubName ? <p className="text-muted">Hosted by {ev.clubName}</p> : null}
      </div>
      {ev.status === "cancelled" ? <p className="font-medium">This ride was cancelled.</p> : null}
      <dl className="flex flex-col gap-3">
        <div><dt className="text-sm text-muted">When</dt><dd>{formatWhen(ev.startsAt, ev.timeZone)}</dd></div>
        <div><dt className="text-sm text-muted">Meeting point</dt><dd>{ev.placeName}</dd></div>
        <div><dt className="text-sm text-muted">Riders</dt><dd>{ev.going} going</dd></div>
      </dl>
      <a href={`myto://event/${id}`} className={`${button} bg-accent text-white hover:bg-accent-hover`}>Open in Myto Moto</a>
      {download ? <a href={download} className={`${button} border border-foreground`}>Get the Myto Moto app</a> : null}
      <p className="max-w-prose text-muted">Reply and check in at the meeting point in the app. You need the app and an account to join.</p>
    </section>
  );
}
