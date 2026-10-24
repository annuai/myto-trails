import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-(--space-section) border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Moto Trails is a subsidiary of{" "}
          <a href="https://www.myto-moto.com" className="text-foreground underline underline-offset-4">
            myto-moto
          </a>
          .
        </p>
        <nav aria-label="Footer">
          <Link href="/donate" className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4">
            Donate
          </Link>
        </nav>
      </div>
    </footer>
  );
}
