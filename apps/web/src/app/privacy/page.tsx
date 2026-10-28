import type { Metadata } from "next";
import { LegalDocument } from "@/features/legal/LegalDocument";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <LegalDocument slug="privacy" />;
}
