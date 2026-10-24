import Link from "next/link";
import { SearchCombobox } from "@/features/discovery/SearchCombobox";

const QUICK = [
  { label: "Western Ghats", href: "/trails?q=ghats" },
  { label: "Himalaya", href: "/trails?q=himalaya" },
  { label: "North East", href: "/trails?q=meghalaya" },
  { label: "Under 20 km", href: "/trails?maxKm=20" },
  { label: "Verified only", href: "/trails?verified=1" },
];

/** Full-width photo hero with the search box. The text sits on a dark overlay so it stays readable on any photo. */
export function Hero({ imageSrc }: { imageSrc: string }) {
  return (
    <section aria-labelledby="hero-title" className="relative ml-[calc(50%-50vw)] w-screen overflow-hidden bg-dark text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/40 to-dark/20" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-widest text-white/80">Motorcycle trails across India</p>
        <h1 id="hero-title" className="max-w-3xl font-display text-3xl leading-tight sm:text-5xl">Find a trail you can actually ride.</h1>
        <p className="max-w-2xl text-lg text-white/90">Every trail shows who is allowed to ride it, how we know, and when it was last checked.</p>
        <div className="max-w-2xl rounded-lg bg-background p-3 text-foreground shadow-xl">
          <SearchCombobox />
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Quick searches">
          {QUICK.map((q) => (
            <li key={q.label}>
              <Link href={q.href} className="inline-flex min-h-11 items-center rounded-full border border-white/40 bg-white/10 px-4 text-sm font-medium backdrop-blur hover:bg-white/20">{q.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
