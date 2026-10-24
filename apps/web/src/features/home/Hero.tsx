import Link from "next/link";
import { NearMeButton } from "@/features/discovery/NearMeButton";
import { SearchCombobox } from "@/features/discovery/SearchCombobox";

const QUICK = [
  { label: "Western Ghats", href: "/trails?q=ghats" },
  { label: "Himalaya", href: "/trails?q=himalaya" },
  { label: "North East", href: "/trails?q=meghalaya" },
  { label: "Under 20 km", href: "/trails?maxKm=20" },
  { label: "Verified only", href: "/trails?verified=1" },
];

/**
 * Full-width hero. The artwork is light and fades to the page colour on its left, so the text sits on it directly in
 * dark ink; on narrow screens a soft page-coloured wash keeps the text readable over the picture.
 */
export function Hero({ imageSrc }: { imageSrc: string }) {
  return (
    <section aria-labelledby="hero-title" className="relative ml-[calc(50%-50vw)] w-screen overflow-hidden bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[75%_bottom] sm:object-right-bottom" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/75 to-background/20 sm:bg-gradient-to-r sm:from-background sm:via-background/60 sm:to-transparent" />
      <div className="relative container-wide flex min-h-[28rem] flex-col justify-center gap-6 pb-16 pt-28 sm:min-h-[36rem] sm:pb-24 sm:pt-40">
        <h1 id="hero-title" className="display-lg max-w-2xl">Find a trail you can actually ride.</h1>
        <p className="max-w-xl text-lg text-muted">Every trail shows who is allowed to ride it, how we know, and when it was last checked.</p>
        <div className="max-w-xl rounded-lg border border-border bg-white/90 p-3 shadow-lg backdrop-blur">
          <SearchCombobox extra={<NearMeButton variant="inline" />} />
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Quick searches">
          {QUICK.map((q) => (
            <li key={q.label}>
              <Link href={q.href} className="inline-flex min-h-11 items-center rounded-full border border-foreground/20 bg-white/70 px-4 text-sm font-medium backdrop-blur hover:bg-white">{q.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
