"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { href: "/trails", label: "Explore" },
  { href: "/trails?view=map", label: "Map" },
  { href: "/regions", label: "Regions" },
];

/**
 * The site header, after myto-moto's navigation: logo left, links centred, actions right. After a short scroll it
 * becomes a floating rounded bar. On small screens the links move into a menu.
 */
export function SiteHeader({ account }: { account?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const floating = scrolled && !open;
  const linkClass = "inline-flex min-h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline";
  return (
    <header className={`sticky top-0 z-40 transition-[padding] duration-300 ${floating ? "px-4 pt-3" : ""}`}>
      <div
        className={`mx-auto transition-all duration-300 ${
          floating ? "max-w-6xl rounded-full bg-white/95 shadow-nav backdrop-blur" : "border-b border-border bg-background/90 backdrop-blur"
        }`}
      >
        <div className={`relative mx-auto flex w-full items-center justify-between gap-4 ${floating ? "p-2.5" : "container-wide min-h-16"}`}>
          <Link href="/" className={`inline-flex min-h-11 items-center ${floating ? "pl-4" : ""}`}>
            <Image src="/brand/logo.png" alt="Moto Trails" width={99} height={32} priority />
          </Link>

          <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <div className="hidden items-center md:flex">{account}</div>
            <Link href="/submit" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
              Submit a trail
            </Link>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/5 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {open ? <path d="M4 4l12 12M16 4 4 16" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
              </svg>
            </button>
          </div>
        </div>

        {open ? (
          <nav id="mobile-menu" aria-label="Primary" className="flex flex-col border-t border-border px-4 pb-4 md:hidden">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={`${linkClass} text-base`}>
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col">{account}</div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
