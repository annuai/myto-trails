import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@/server/db/client";
import { listRoleHolders } from "@/server/moderation/users";
import { requireAdmin } from "@/server/moderation/session";
import { roleAction } from "../actions";

export const instant = false;
export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };
const input = "min-h-12 w-full rounded-sm border border-foreground/40 bg-background px-3";

export default async function UsersPage({ searchParams }: PageProps<"/moderate/users">) {
  const actor = await requireAdmin("/moderate/users");
  const r = await listRoleHolders(getSql(), actor.id);
  const sp = await searchParams;
  const items = r.ok ? r.items : [];
  return (
    <section className="flex max-w-2xl flex-col gap-8 py-8">
      <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
      <h1 className="text-3xl font-semibold leading-tight">People</h1>
      {sp.result === "saved" ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">Saved.</p> : typeof sp.result === "string" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">That did not go through: {sp.result.replaceAll("_", " ")}.</p> : null}
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={`${i.userId}-${i.role}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <span>{i.name} · {i.role}</span>
            <form action={roleAction}>
              <input type="hidden" name="userId" value={i.userId} /><input type="hidden" name="role" value={i.role} />
              <button type="submit" name="intent" value="revoke" className="min-h-11 text-sm underline underline-offset-4">Remove role</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={roleAction} className="flex flex-col gap-3 border border-border p-4">
        <h2 className="text-xl font-semibold">Give someone a role</h2>
        <label className="text-sm font-medium" htmlFor="email">Their account email (they must have signed in once)</label>
        <input id="email" name="email" type="email" required className={input} />
        <label className="text-sm font-medium" htmlFor="role">Role</label>
        <select id="role" name="role" className={input}><option value="moderator">Moderator</option><option value="admin">Admin</option></select>
        <button type="submit" name="intent" value="grant" className="min-h-12 self-start rounded-md border border-foreground px-5 text-sm font-medium">Grant role</button>
      </form>
    </section>
  );
}
