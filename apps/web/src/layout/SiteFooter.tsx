import Link from "next/link";

const link = "inline-flex min-h-11 items-center text-foreground underline-offset-4 hover:underline";

export function SiteFooter() {
  return (
    <footer className="mt-(--space-section) border-t border-border bg-stone/50">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="text-base font-semibold">Moto Trails</p>
          <p className="mt-2 max-w-md text-muted">A moderated directory of motorcycle trails in India. Every trail shows who may ride it, how we know, and when it was last checked.</p>
        </div>
        <nav aria-label="Footer" className="contents">
          <div className="flex flex-col">
            <p className="font-medium">Explore</p>
            <Link href="/trails" className={link}>All trails</Link>
            <Link href="/trails?view=map" className={link}>Map</Link>
            <Link href="/regions" className={link}>Regions</Link>
            <Link href="/submit" className={link}>Submit a trail</Link>
          </div>
          <div className="flex flex-col">
            <p className="font-medium">About</p>
            <Link href="/about" className={link}>About</Link>
            <Link href="/responsible-riding" className={link}>Ride responsibly</Link>
            <Link href="/terms" className={link}>Terms</Link>
            <Link href="/privacy" className={link}>Privacy</Link>
            <Link href="/donate" className={link}>Donate</Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-sm text-muted">
          Moto Trails is a project by{" "}
          <a href="https://myto-moto.com" className="text-foreground underline underline-offset-4">
            myto-moto
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
