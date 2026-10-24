import Image from "next/image";
import Link from "next/link";
import { FooterClock } from "./FooterClock";

const link = "inline-flex min-h-11 items-center text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline";
const heading = "font-mono text-xs font-semibold uppercase tracking-widest";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/trails", label: "All trails" },
      { href: "/trails?view=map", label: "Map" },
      { href: "/regions", label: "Regions" },
    ],
  },
  {
    title: "Contribute",
    links: [
      { href: "/submit", label: "Submit a trail" },
      { href: "/responsible-riding", label: "Ride responsibly" },
      { href: "/donate", label: "Donate" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-(--space-section) border-t border-border">
      <div className="container-wide">
        <div className="flex flex-col justify-between gap-10 py-14 sm:flex-row sm:items-start">
          <div className="max-w-sm">
            <Image src="/brand/logo.png" alt="Moto Trails" width={120} height={39} />
            <p className="mt-5 text-lg text-muted">A moderated directory of motorcycle trails in India. Every trail shows who may ride it, how we know, and when it was last checked.</p>
          </div>
          <FooterClock />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-border py-12 sm:grid-cols-3">
          {columns.map((c) => (
            <div key={c.title} className="flex flex-col">
              <p className={`${heading} mb-3`}>{c.title}</p>
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} className={link}>{l.label}</Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-border py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Moto Trails is a project by{" "}
            <a href="https://myto-moto.com" className="text-foreground underline underline-offset-4">
              myto-moto
            </a>
            .
          </p>
          <p className="flex items-center gap-3 font-mono text-xs">
            <span>© Moto Trails</span>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
