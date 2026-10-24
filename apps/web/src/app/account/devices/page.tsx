import type { Metadata } from "next";
import Link from "next/link";
import { DeviceForm } from "@/features/account/DeviceForm";
import { listTokens } from "@/server/api/tokens";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { createDeviceAction, revokeDeviceAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Connected devices", robots: { index: false, follow: false } };

export default async function DevicesPage() {
  const user = await requireUser("/account/devices");
  const tokens = (await listTokens(getSql(), user.id)).filter((t) => !t.revoked);
  return (
    <section className="flex max-w-prose flex-col gap-8 py-8">
      <Link href="/account" className="text-sm underline underline-offset-4">Back to account</Link>
      <h1 className="text-3xl font-semibold leading-tight">Connected devices</h1>
      <p className="text-muted">A device token lets the Moto Trails app or a Myto Navi unit read your Saved trails and send trails for you, without your email. Treat it like a password and remove it if the device is lost.</p>
      <DeviceForm action={createDeviceAction} />
      <div>
        <h2 className="text-xl font-semibold">Active devices</h2>
        {tokens.length === 0 ? <p className="mt-2 text-muted">None yet.</p> : (
          <ul className="mt-3 flex flex-col gap-3">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <span>{t.label} · {t.kind.replace("_", " ")} · {t.scopes.join(", ")}<span className="block text-sm text-muted">{t.lastUsedAt ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString("en-GB")}` : "Never used"}</span></span>
                <form action={revokeDeviceAction}>
                  <input type="hidden" name="tokenId" value={t.id} />
                  <button type="submit" className="min-h-11 text-sm underline underline-offset-4">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
