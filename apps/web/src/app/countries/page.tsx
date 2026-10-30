import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/ui/Breadcrumbs/Breadcrumbs";
import { getCountries } from "@/server/countries/queries";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";
import { chooseCountryAction } from "./actions";

export const metadata: Metadata = { title: "Countries", description: "Where Moto Trails is open, and where it is coming soon." };

export default async function CountriesPage() {
  const countries = await getCountries();
  const open = countries.filter((c) => c.enabled);
  const soon = countries.filter((c) => c.comingSoon);
  return (
    <div className="flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Countries" }]} />
        <h1 className="font-display text-3xl leading-tight">Countries</h1>
        <p className="max-w-prose text-muted">Choose the country whose trails you want to see. You can change it any time.</p>
      </header>
      <section aria-labelledby="open">
        <h2 id="open" className="text-xl font-semibold">Open now</h2>
        <ul className="mt-4 border-t border-border">
          {open.map((c) => (
            <li key={c.iso2} className="flex items-center justify-between gap-4 border-b border-border py-2">
              <Link href={`/regions/${c.slug}`} className="inline-flex min-h-11 items-center text-lg font-semibold underline-offset-4 hover:underline">{c.name}</Link>
              <form action={chooseCountryAction}>
                <input type="hidden" name="country" value={c.iso2} />
                <SubmitButton className="min-h-11 rounded-lg border border-foreground/40 px-4 text-sm font-medium">Show {c.name} trails</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
      {soon.length > 0 ? (
        <section aria-labelledby="soon">
          <h2 id="soon" className="text-xl font-semibold">Coming soon</h2>
          <p className="mt-2 max-w-prose text-muted">We plan to open in these countries in the near future. Ask to be told when we do.</p>
          <ul className="mt-4 border-t border-border">
            {soon.map((c) => (
              <li key={c.iso2} className="border-b border-border">
                <Link href={`/regions/${c.slug}`} className="inline-flex min-h-11 items-center py-3 text-lg font-semibold underline-offset-4 hover:underline">{c.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
