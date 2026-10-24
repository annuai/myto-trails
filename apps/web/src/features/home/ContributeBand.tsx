import Link from "next/link";

/** The call to share a trail. Dark band, one clear action. */
export function ContributeBand() {
  return (
    <section aria-labelledby="contribute-title" className="my-12 flex flex-col items-start gap-4 rounded-lg bg-dark p-8 text-white sm:p-12">
      <h2 id="contribute-title" className="max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">Know a trail worth riding?</h2>
      <p className="max-w-2xl text-white/85">Share it with a GPX file and a few photos. A moderator checks the access before anyone else sees it, and you are credited by name.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/submit" className="inline-flex min-h-12 items-center rounded-lg bg-background px-5 text-sm font-medium text-foreground hover:bg-white">Submit a trail</Link>
        <Link href="/responsible-riding" className="inline-flex min-h-12 items-center rounded-lg border border-white/50 px-5 text-sm font-medium hover:bg-white/10">Ride responsibly</Link>
      </div>
    </section>
  );
}
