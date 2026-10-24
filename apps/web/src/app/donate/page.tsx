import type { Metadata } from "next";
import { DonateContent } from "@/features/legal/DonateContent";

export const metadata: Metadata = { title: "Donate" };

export default function DonatePage() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Donate</h1>
      <div className="mt-6">
        <DonateContent url={process.env.NEXT_PUBLIC_DONATE_URL} />
      </div>
    </section>
  );
}
