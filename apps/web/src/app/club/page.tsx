import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClubAction } from "@/features/club/actions";
import { CLUB_NOTES } from "@/features/club/messages";
import { requireUser } from "@/server/auth/session";
import { listClubs } from "@/server/community/clubs";
import { getSql } from "@/server/db/client";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

export const instant = false;
export const metadata: Metadata = { title: "Club", robots: { index: false, follow: false } };

const input = "w-full rounded-lg border border-foreground/40 bg-background px-3 py-2";

export default async function ClubPage({ searchParams }: PageProps<"/club">) {
  const user = await requireUser("/club");
  const sp = await searchParams;
  await connection();
  const clubs = await listClubs(getSql(), user.id);
  const note = typeof sp.n === "string" ? CLUB_NOTES[sp.n] : undefined;
  const mine = clubs.filter((c) => c.role);
  const others = clubs.filter((c) => !c.role);
  return (
    <section className="flex max-w-3xl flex-col gap-10 py-(--space-section)">
      <div className="flex flex-col gap-3">
        <h1 className="display-md">Club</h1>
        <p className="max-w-prose text-muted">Ride with people you trust. Join a club by asking its admins, or start your own. Only signed-in riders can see clubs. Chat is not here yet; it will come if enough riders want it.</p>
      </div>
      {note ? <p role="status" className={`border-l-4 py-1 pl-4 font-medium ${note.tone === "good" ? "border-status-good" : "border-status-stop"}`}>{note.text}</p> : null}

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Your clubs</h2>
        {mine.length ? <ClubList clubs={mine} /> : <p className="text-muted">You are not in a club yet.</p>}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Find a club</h2>
        {others.length ? <ClubList clubs={others} /> : <p className="text-muted">No other clubs yet. Start the first one below.</p>}
      </div>

      <form action={createClubAction} className="flex max-w-xl flex-col gap-3 rounded-3xl bg-card-cream p-6">
        <h2 className="text-xl font-semibold">Start a club</h2>
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input id="name" name="name" required minLength={3} maxLength={60} className={input} />
        <label htmlFor="description" className="text-sm font-medium">What is it for? <span className="text-muted">(optional)</span></label>
        <textarea id="description" name="description" rows={3} maxLength={500} className={input} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="womenOnly" className="mt-1" /> Women-only club (only riders who have said they ride as women can join)</label>
        <p className="text-sm text-muted">You become the club&apos;s admin. People who ask to join give you their phone number, which you can see until a week after you decide.</p>
        <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Create club</SubmitButton>
      </form>
    </section>
  );
}

function ClubList({ clubs }: { clubs: Awaited<ReturnType<typeof listClubs>> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {clubs.map((c) => (
        <li key={c.clubId} className="rounded-3xl bg-card-cream p-5">
          <Link href={`/club/${c.clubId}`} className="text-lg font-semibold underline-offset-4 hover:underline">{c.name}</Link>
          <p className="mt-1 text-sm text-muted">{c.memberCount} {c.memberCount === 1 ? "member" : "members"}{c.womenOnly ? " · Women only" : ""}{c.role === "admin" ? " · You are admin" : ""}{c.requested ? " · Request sent" : ""}</p>
          {c.description ? <p className="mt-2 line-clamp-3 break-words">{c.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}
