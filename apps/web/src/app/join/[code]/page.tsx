import type { Metadata } from "next";
import { connection } from "next/server";
import { getAppDownloadUrl } from "@/lib/site";
import { normalizeCode } from "@/server/rides/group-rides";

export const instant = false;
// The page never looks the code up, so it cannot say whether a ride exists or anything about it. Keep it out of search results and Referer headers.
export const metadata: Metadata = { title: "Join a group ride", robots: { index: false, follow: false }, referrer: "no-referrer" };

const button = "inline-flex min-h-12 w-fit items-center rounded-lg px-5 text-sm font-medium";

/** What a shared invite link opens: the code, a button into the app, and what to do when the button does nothing. */
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  await connection();
  const { code: raw } = await params;
  const code = normalizeCode(decodeURIComponent(raw));
  if (!code) {
    return (
      <section className="flex max-w-2xl flex-col gap-3 py-(--space-section)">
        <h1 className="display-md">This invite link does not look right</h1>
        <p className="max-w-prose text-muted">Ask the rider who invited you to send it again.</p>
      </section>
    );
  }
  const download = getAppDownloadUrl(process.env);
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-(--space-section)">
      <h1 className="display-md">Join a group ride on Myto Moto</h1>
      <p className="max-w-prose text-muted">A rider invited you to ride together. Everyone in the group sees each other on the map while the ride is on.</p>
      <p aria-label={`Code ${code.split("").join(" ")}`} className="font-mono text-4xl font-semibold tracking-widest">{code}</p>
      <a href={`myto://join/${code}`} className={`${button} bg-accent text-white hover:bg-accent-hover`}>Open in Myto Moto</a>
      {download ? <a href={download} className={`${button} border border-foreground`}>Get the Myto Moto app</a> : null}
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-xl font-semibold">If the button does nothing</h2>
        <p className="text-muted">Open Myto Moto, tap Ride, then Group ride, then type the code above. You need the app and an account to join.</p>
      </div>
    </section>
  );
}
