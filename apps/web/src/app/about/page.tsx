import type { Metadata } from "next";
import { LegalDocument } from "@/features/legal/LegalDocument";

export const metadata: Metadata = { title: "About Moto Trails" };

export default function AboutPage() {
  return <LegalDocument slug="about" />;
}
