import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/features/account/SignInForm";
import { safeNextPath } from "@/server/auth/safe-next";
import { getCurrentUser } from "@/server/auth/session";
import { signInAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCurrentUser()) redirect(next);
  const message = sp.limited
    ? "Too many sign-in requests. Please try again in an hour."
    : sp.expired
      ? "That sign-in link has expired or was already used. Request a new one."
      : undefined;
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Sign in</h1>
      <p className="mt-4 max-w-prose text-muted">You need an account to save trails and report problems. Browsing never needs one.</p>
      <div className="mt-8">
        <SignInForm action={signInAction} next={next} message={message} />
      </div>
    </section>
  );
}
