import Link from "next/link";

export default function Home() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight sm:text-4xl">Find a trail you can actually ride.</h1>
      <p className="mt-6 max-w-prose text-muted">Trail directory coming soon.</p>
      <Link href="/regions" className="mt-8 inline-flex min-h-11 items-center text-foreground underline underline-offset-4">
        Browse by region
      </Link>
    </section>
  );
}
