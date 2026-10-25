import type { Metadata } from "next";
import { OpenApp } from "./OpenApp";

export const metadata: Metadata = { title: "Open the Myto app", robots: { index: false, follow: false } };

export default function OpenAppPage() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Open the Myto app</h1>
      <OpenApp />
    </section>
  );
}
