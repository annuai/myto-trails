import type { Metadata } from "next";
import Link from "next/link";
import { soleAdminClubs } from "@/server/account/delete";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";
import { deleteAccountAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Delete account", robots: { index: false, follow: false } };

export default async function DeleteAccountPage({ searchParams }: PageProps<"/account/delete">) {
  const user = await requireUser("/account/delete");
  const sp = await searchParams;
  const clubs = await soleAdminClubs(getSql(), user.id);
  return (
    <section className="flex max-w-prose flex-col gap-6 py-8">
      <Link href="/account" className="text-sm underline underline-offset-4">Back to account</Link>
      <h1 className="text-3xl font-semibold leading-tight">Delete your account</h1>
      <p>This cannot be undone. Signed in as <span className="font-mono">{user.email}</span>.</p>

      <div>
        <h2 className="text-xl font-semibold">What is deleted</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Your account, your email address and every device and browser signed in to it.</li>
          <li>Your profile, picture and bike, and your saved trails.</li>
          <li>Your comments, questions and club posts, and the replies other riders wrote under them.</li>
          <li>Your club memberships and join requests, including any phone number you gave.</li>
          <li>Your drafts, and uploaded photos and route files that were not published.</li>
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold">What stays</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>Trails you submitted that were published, with their photos and routes. Your name is removed from them.</li>
          <li>Problem reports you filed, shown as from a &quot;Former rider&quot;.</li>
        </ul>
      </div>

      {clubs.length > 0 ? (
        <p role="alert" className="border-l-4 border-status-caution py-1 pl-4">
          You are the only admin of {clubs.join(", ")}. Make another member an admin, or leave the club, before you delete your account.
        </p>
      ) : null}
      {sp.error === "confirm" ? <p role="alert" className="text-sm font-medium text-status-stop">Type the word delete to confirm.</p> : null}
      {sp.error === "club" && clubs.length === 0 ? <p role="alert" className="text-sm font-medium text-status-stop">We could not delete the account. Try again.</p> : null}

      <form action={deleteAccountAction} className="flex max-w-md flex-col gap-3">
        <label htmlFor="confirm" className="text-sm font-medium">Type <span className="font-mono">delete</span> to confirm</label>
        <input id="confirm" name="confirm" required autoComplete="off" autoCapitalize="none" spellCheck={false} className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
        <SubmitButton className="min-h-12 self-start rounded-lg bg-status-stop px-5 text-sm font-medium text-white">Delete my account</SubmitButton>
      </form>
    </section>
  );
}
