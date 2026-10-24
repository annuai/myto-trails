import Link from "next/link";
import { NearMeButton } from "@/features/discovery/NearMeButton";
import { SearchCombobox } from "@/features/discovery/SearchCombobox";

export default function Home() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight sm:text-4xl">Find a trail you can actually ride.</h1>
      <div className="mt-8 flex max-w-xl flex-col gap-4">
        <SearchCombobox />
        <NearMeButton />
      </div>
      <Link href="/regions" className="mt-6 inline-flex min-h-11 items-center text-foreground underline underline-offset-4">
        Browse by region
      </Link>
    </section>
  );
}
