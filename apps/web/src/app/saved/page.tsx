import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SavedItemCard } from "@/features/saved/SavedItemCard";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { listSaved } from "@/server/queries/saved";
import { removeSavedAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Saved trails", robots: { index: false, follow: false } };

export default async function SavedPage() {
  const user = await requireUser("/saved");
  await connection();
  const items = await listSaved(getSql(), user.id, new Date());
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="font-display text-3xl leading-tight">Saved trails</h1>
      {items.length === 0 ? (
        <div className="max-w-prose">
          <p className="font-medium">Nothing saved yet.</p>
          <p className="mt-2 text-muted">Save a trail to keep it here and see if its access or condition changes.</p>
          <Link href="/trails" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">Explore trails</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <SavedItemCard key={item.trail?.slug ?? item.unavailableId} item={item} remove={removeSavedAction} />
          ))}
        </div>
      )}
    </div>
  );
}
