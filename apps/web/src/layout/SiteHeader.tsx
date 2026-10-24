import Image from "next/image";
import Link from "next/link";

const nav = [
  { href: "/trails", label: "Explore" },
  { href: "/trails?view=map", label: "Map" },
  { href: "/regions", label: "Regions" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4">
      <Link href="/" className="inline-flex min-h-11 items-center">
        <Image src="/brand/logo.png" alt="Moto Trails" width={99} height={32} priority />
      </Link>
      <nav aria-label="Primary" className="flex gap-1">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
