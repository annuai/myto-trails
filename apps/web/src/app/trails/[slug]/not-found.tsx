import Link from "next/link";

export default function TrailNotFound() {
  return (
    <section className="py-(--space-section)">
      <h1 className="text-3xl font-semibold leading-tight">We can&apos;t find that trail</h1>
      <p className="mt-4 max-w-prose text-muted">It may have been renamed, removed, or not published yet.</p>
      <Link href="/regions" className="mt-6 inline-flex min-h-11 items-center text-foreground underline underline-offset-4">
        Browse trails by region
      </Link>
    </section>
  );
}
