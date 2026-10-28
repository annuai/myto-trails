import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false, follow: false } };

export default function AccountDeletedPage() {
  return (
    <section className="flex max-w-prose flex-col gap-4 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Your account is deleted</h1>
      <p>Your account and personal data have been removed, and you are signed out. Thank you for riding with Moto Trails.</p>
      <p><Link href="/" className="underline underline-offset-4">Back to the home page</Link></p>
    </section>
  );
}
