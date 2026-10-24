import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/trails", label: "Explore" },
  { href: "/trails?view=map", label: "Map" },
  { href: "/regions", label: "Regions" },
];

export function SiteHeader({ account }: { account?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Image src="/brand/logo.png" alt="Moto Trails" width={99} height={32} priority />
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
          {account}
          <Link href="/submit" className="ml-2 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
            Submit a trail
          </Link>
        </nav>
      </div>
    </header>
  );
}
