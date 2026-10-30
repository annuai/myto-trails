import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { INDIA_STATES } from "@moto-trails/domain";
import { ComingSoon } from "@/features/country/ComingSoon";
import { Breadcrumbs } from "@/ui/Breadcrumbs/Breadcrumbs";
import { notifyMeAction } from "@/app/countries/actions";
import { getCountryBySlug } from "@/server/countries/queries";
import { getRegionsForHub } from "@/server/queries/regions";

// Awaiting params makes the route render on demand, with a real 404 for unknown countries.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/regions/[country]">): Promise<Metadata> {
  const { country } = await params;
  const c = await getCountryBySlug(country);
  if (!c) return {};
  return c.enabled
    ? { title: `Motorcycle trails in ${c.name}`, description: `Browse motorcycle trails in ${c.name} by state, with access, condition and verification for each.` }
    : { title: `Moto Trails in ${c.name}: coming soon`, description: `Moto Trails isn't open in ${c.name} yet. Ask to be told when it opens.`, robots: { index: false, follow: true } };
}

export default async function CountryPage({ params, searchParams }: PageProps<"/regions/[country]">) {
  const { country } = await params;
  const c = await getCountryBySlug(country);
  if (!c) {
    // Old links were /regions/<state>; they now live under India.
    if (INDIA_STATES.some((s) => s.slug === country)) permanentRedirect(`/regions/india/${country}`);
    notFound();
  }
  const sp = await searchParams;
  const states = c.enabled ? (await getRegionsForHub()).filter((r) => r.countrySlug === c.slug) : [];
  return (
    <div className="flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Countries", href: "/countries" }, { label: c.name }]} />
        <h1 className="font-display text-3xl leading-tight">{c.name}</h1>
      </header>
      {c.comingSoon ? (
        <ComingSoon country={c.name} slug={c.slug} action={notifyMeAction} status={typeof sp.notify === "string" ? sp.notify : undefined} />
      ) : states.length === 0 ? (
        <p className="max-w-prose text-muted">No trails have been published in {c.name} yet.</p>
      ) : (
        <ul className="border-t border-border">
          {states.map((s) => (
            <li key={s.slug} className="flex items-baseline justify-between border-b border-border">
              <Link href={`/regions/${c.slug}/${s.slug}`} className="inline-flex min-h-11 items-center py-3 text-lg font-semibold underline-offset-4 hover:underline">{s.name}</Link>
              <span className="font-mono text-sm text-muted">{s.publishedTrailCount} {s.publishedTrailCount === 1 ? "trail" : "trails"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
