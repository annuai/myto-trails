import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email", robots: { index: false, follow: false } };

export default function CheckEmailPage() {
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Check your email</h1>
      <p className="mt-4 max-w-prose">If that address can receive email, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
      <p className="mt-4 max-w-prose text-muted">Nothing arrived? Check your spam folder, or go back and try again.</p>
    </section>
  );
}
