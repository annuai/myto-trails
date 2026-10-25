import type { Metadata } from "next";
import Link from "next/link";
import { allowedRedirects, isAllowedRedirect, isChallenge } from "@/server/auth/app-auth";
import { requireUser } from "@/server/auth/session";

export const instant = false;
export const metadata: Metadata = { title: "Connect the Myto app", robots: { index: false, follow: false } };

// The phone app sends riders here. Signing in is the website's own email link; this page only hands the app a
// one-time code, which the app trades for a revocable device token (ADR 0006, PKCE).
export default async function ConnectAppPage({ searchParams }: PageProps<"/auth/app">) {
  const sp = await searchParams;
  const challenge = typeof sp.challenge === "string" ? sp.challenge : "";
  const redirectUri = typeof sp.redirect_uri === "string" ? sp.redirect_uri : "";
  const state = typeof sp.state === "string" ? sp.state : "";
  const valid = isChallenge(challenge) && isAllowedRedirect(redirectUri, allowedRedirects(process.env));

  if (!valid) {
    return (
      <section className="py-(--space-section)">
        <h1 className="font-display text-3xl leading-tight">Connect the Myto app</h1>
        <p className="mt-6 max-w-prose">This link is not valid. Open it again from the app.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">Back to Moto Trails</Link>
      </section>
    );
  }
  const returnTo = `/auth/app?challenge=${encodeURIComponent(challenge)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  const user = await requireUser(returnTo);
  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Connect the Myto app</h1>
      <form action="/auth/app/connect" method="post" className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="challenge" value={challenge} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="state" value={state} />
        <p className="max-w-prose">Sign the Myto app in as <strong>{user.email}</strong>? It will be able to read your Saved trails and send ride drafts for review. You can remove it any time under Account, Connected devices.</p>
        <button type="submit" className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Connect the app</button>
        <p className="max-w-prose text-sm text-muted">Your phone will ask to open Myto. If nothing happens, open the Myto app yourself and tap Sign in again.</p>
      </form>
    </section>
  );
}
