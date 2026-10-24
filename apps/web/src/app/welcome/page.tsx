import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeForm } from "@/features/community/WelcomeForm";
import { safeNextPath } from "@/server/auth/safe-next";
import { requireUser } from "@/server/auth/session";
import { welcomeAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : "/");
  const user = await requireUser("/welcome", { allowUnconfirmed: true });
  if (user.confirmed) redirect(next);
  return (
    <section className="flex flex-col gap-8 py-8">
      <div className="max-w-xl">
        <h1 className="display-md">Welcome to Moto Trails</h1>
        <p className="mt-3 text-muted">Before you start, two quick things. Riders only: everything here is for people who are 18 or older and licensed to ride.</p>
      </div>
      <WelcomeForm action={welcomeAction} next={next} displayName={user.displayName} />
    </section>
  );
}
