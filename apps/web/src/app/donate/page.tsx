import type { Metadata } from "next";

export const metadata: Metadata = { title: "Donate" };

export default function DonatePage() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Donate</h1>
      <p className="mt-6 max-w-prose text-muted">Donations are not open yet.</p>
    </section>
  );
}
