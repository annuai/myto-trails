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
 * dark ink. On narrow screens the picture sits in its own band under the text, fading in from the page colour, so the
 * rider is not hidden behind the search box. The headline fades between two lines (CSS only; with reduced motion the
 * first line stays); screen readers get both lines once.
 */
export function Hero({ imageSrc }: { imageSrc: string }) {
  return (
    <section aria-labelledby="hero-title" className="relative ml-[calc(50%-50vw)] w-screen overflow-hidden bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt="" fetchPriority="high" className="absolute inset-x-0 bottom-0 h-80 w-full object-cover object-[80%_bottom] sm:inset-0 sm:h-full sm:object-right-bottom" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-background via-transparent via-45% to-transparent sm:inset-0 sm:h-auto sm:bg-gradient-to-r sm:from-background sm:via-background/60 sm:via-50% sm:to-transparent" />
      <div className="relative container-wide flex min-h-[28rem] flex-col justify-center gap-6 pb-56 pt-28 sm:min-h-[36rem] sm:pb-24 sm:pt-40">
        <h1 id="hero-title" className="display-lg max-w-2xl">
          <span className="sr-only">Find a trail you can actually ride. Escape and connect.</span>
          <span aria-hidden="true" className="grid">
            <span className="hero-line-a col-start-1 row-start-1">Find a trail you can actually ride.</span>
            <span className="hero-line-b col-start-1 row-start-1">Escape and connect.</span>
          </span>
        </h1>
        <p className="max-w-xl text-lg text-muted">Every trail shows who is allowed to ride it, how we know, and when it was last checked.</p>
        <div className="max-w-xl rounded-lg border border-border bg-white/90 p-3 shadow-lg backdrop-blur">
          <SearchCombobox secondary extra={<NearMeButton variant="inline" />} />
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
