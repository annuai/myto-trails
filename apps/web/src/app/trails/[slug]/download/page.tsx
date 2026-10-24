import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canDownloadGpx } from "@moto-trails/domain";
import { getTrail } from "@/server/queries/trails";

export const instant = false;
export const metadata: Metadata = { title: "Download GPX", robots: { index: false, follow: false } };

/** The step before a GPX download: access status and permission wording are read before the file is handed over. */
export default async function DownloadPage({ params }: PageProps<"/trails/[slug]/download">) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  const decision = canDownloadGpx({ lifecycle: "published", accessClass: trail.accessClass, sensitivity: trail.sensitivity, hasGpx: trail.hasGpx, condition: trail.condition });

  return (
    <section className="flex max-w-prose flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Download GPX</h1>
      <p className="text-muted">For <Link href={`/trails/${slug}`} className="underline underline-offset-4">{trail.name}</Link></p>

      {!decision.allowed ? (
        <div role="status" className="border-l-4 border-border pl-4">
          <p className="font-medium">A GPX file is not available for this trail.</p>
          <Link href={`/trails/${slug}`} className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">Back to the trail</Link>
        </div>
      ) : (
        <>
          {trail.accessClass === "permission_required" ? (
            <div className="border-l-4 border-status-caution pl-4">
              <p className="font-medium">Permission is required to ride this trail.</p>
              <p className="mt-1">Get permission before you ride. Having this file is not permission.</p>
              {trail.permissionInstructions ? <p className="mt-2">{trail.permissionInstructions}</p> : null}
            </div>
          ) : null}
          <ul className="list-disc pl-5">
            <li>Conditions change. Check the trail page again close to your ride.</li>
            <li>Ride within your ability and the law, and respect land owners and local communities.</li>
            <li>The file contains the route and its access note; it does not guarantee the way is open.</li>
          </ul>
          <a href={`/trails/${slug}/gpx`} className="inline-flex min-h-11 w-fit items-center border border-ink px-4 underline-offset-4 hover:underline">
            I understand, download the GPX
          </a>
        </>
      )}
    </section>
  );
}
