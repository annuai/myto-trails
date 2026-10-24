import Image from "next/image";
import Link from "next/link";
import { FooterClock } from "./FooterClock";

// Sizes follow myto-moto's footer: small type, compact columns.
const link = "inline-block py-1 text-sm text-muted transition-opacity hover:opacity-50";
const heading = "mb-4 text-[10px] font-bold uppercase tracking-[0.12em]";

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
    <footer className="mt-24 bg-background">
      <div className="border-t border-black/[0.08]">
        <div className="container-wide pb-12 pt-16">
          <div className="mb-14 flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Image src="/brand/logo.png" alt="Moto Trails" width={112} height={36} className="mb-5 h-8 w-auto" />
              <p className="max-w-[260px] text-sm leading-relaxed text-muted">A moderated directory of motorcycle trails in India: who may ride, how we know, and when it was last checked.</p>
            </div>
            <FooterClock />
          </div>

          <nav aria-label="Footer" className="mb-14 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-black/[0.07] pt-12 md:grid-cols-3">
            {columns.map((c) => (
              <div key={c.title}>
                <p className={heading}>{c.title}</p>
                <ul className="space-y-1.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={link}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-4 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Moto Trails is a project by{" "}
              <a href="https://myto-moto.com" className="text-foreground underline underline-offset-4">
                myto-moto
              </a>
              .
            </p>
            <p className="flex items-center gap-4 text-xs text-muted">
              <span>© Moto Trails</span>
              <span aria-hidden="true" className="text-black/20">·</span>
              <Link href="/privacy" className="transition-opacity hover:opacity-50">Privacy</Link>
              <Link href="/terms" className="transition-opacity hover:opacity-50">Terms</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
