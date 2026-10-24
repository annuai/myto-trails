import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getRiderProfile } from "@/server/community/members";
import { getSql } from "@/server/db/client";

export const instant = false;
export const metadata: Metadata = { title: "Rider", robots: { index: false, follow: false } };

export default async function RiderPage({ params }: PageProps<"/riders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/riders/${id}`);
  const profile = await getRiderProfile(getSql(), { viewerId: user.id, handle: id });
  if (!profile) notFound();
  return (
    <section className="flex max-w-3xl flex-col gap-6 py-(--space-section)">
      <h1 className="display-md break-words">{profile.name}</h1>
      {profile.bio ? <p className="max-w-prose whitespace-pre-line break-words">{profile.bio}</p> : null}
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Trails ridden</h2>
        {profile.trails.length === 0 ? <p className="text-muted">None yet.</p> : (
          <ul className="flex flex-col gap-2">
            {profile.trails.map((t) => (
              <li key={t.slug} className="rounded-2xl bg-card-cream px-4 py-3">
                <Link href={`/trails/${t.slug}`} className="font-medium underline-offset-4 hover:underline">{t.name}</Link>
                {t.month ? <span className="ml-2 text-sm text-muted">{new Date(t.month).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
