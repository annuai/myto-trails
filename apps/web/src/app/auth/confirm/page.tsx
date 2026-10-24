import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/server/auth/safe-next";
import { peekLoginToken } from "@/server/auth/auth";
import { getSql } from "@/server/db/client";
import { confirmAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false, follow: false } };

// Opening the link only shows this page; signing in happens on the button's POST, so email scanners that
// pre-open links cannot use the token up.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : undefined);
  const valid = await peekLoginToken(getSql(), token);

  return (
    <section className="py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Confirm sign-in</h1>
      {valid ? (
        <form action={confirmAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="next" value={next} />
          <p className="max-w-prose">Press the button to finish signing in on this device.</p>
          <button type="submit" className="min-h-12 self-start rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">
            Sign in
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <p className="max-w-prose">This link has expired or was already used.</p>
          <Link href="/sign-in" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">Request a new link</Link>
        </div>
      )}
    </section>
  );
}
