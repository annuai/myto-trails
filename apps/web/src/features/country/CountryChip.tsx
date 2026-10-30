import Link from "next/link";

/** "Showing: India · change". Shown where lists depend on the browsing country. */
export function CountryChip({ name, notOpenYet }: { name: string | null; notOpenYet?: string | null }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      <span>Showing: <span className="font-medium text-foreground">{name ?? "All open countries"}</span></span>
      <span aria-hidden="true">·</span>
      <Link href="/countries" className="inline-flex min-h-11 items-center underline underline-offset-4">change</Link>
      {notOpenYet ? <span className="basis-full">Moto Trails isn&apos;t open in {notOpenYet} yet, so you&apos;re seeing everywhere we are open.</span> : null}
    </p>
  );
}
