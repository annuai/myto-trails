import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { signOutAction, signOutEverywhereAction, updateNameAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const sp = await searchParams;
  return (
    <section className="flex flex-col gap-10 py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">Account</h1>
      <div>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-mono">{user.email}</p>
      </div>
      <form action={updateNameAction} className="flex max-w-md flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium">Display name</label>
        <input id="name" name="name" defaultValue={user.displayName} minLength={2} maxLength={40} required className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
        <p className="text-sm text-muted">Shown with trails you contribute.</p>
        {sp.saved ? <p role="status" className="text-sm font-medium text-status-good">Saved.</p> : null}
        {sp.error ? <p role="status" className="text-sm font-medium text-status-stop">Use 2 to 40 characters.</p> : null}
        <button type="submit" className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Save name</button>
      </form>
      <p><Link href="/account/contributions" className="underline underline-offset-4">Your contributions</Link></p>
      <p><Link href="/account/questions" className="underline underline-offset-4">Your questions</Link></p>
      <p><Link href="/account/devices" className="underline underline-offset-4">Connected devices</Link></p>
      <div className="flex flex-wrap gap-4">
        <form action={signOutAction}>
          <button type="submit" className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Sign out</button>
        </form>
        <form action={signOutEverywhereAction}>
          <button type="submit" className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Sign out on all devices</button>
        </form>
      </div>
    </section>
  );
}
