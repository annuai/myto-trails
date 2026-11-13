import Link from "next/link";

/** Home page band announcing the app. Hairlines above and below, one line of news, two ways in. */
export function AppBand() {
  return (
    <section aria-labelledby="app-band-title" className="flex flex-col gap-4 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <h2 id="app-band-title" className="font-medium">The Myto Moto app is coming.</h2>
        <p className="text-muted">Record the ride, follow a route with no signal, ride with a group. The Android beta is open to anyone.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-6">
        <a href="https://myto-moto.com/app#beta" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Try the beta<span className="sr-only"> (opens myto-moto.com)</span></a>
        <Link href="/app#list" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Join the list</Link>
      </div>
    </section>
  );
}
