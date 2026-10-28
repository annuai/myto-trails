import type { Metadata } from "next";
import { LegalDocument } from "@/features/legal/LegalDocument";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return <LegalDocument slug="terms" />;
}
