"use client";

import Link from "next/link";
import { useState } from "react";

type Result = { ok: boolean };

/** Save/unsave toggle. Signed-out visitors are sent to sign in and come back to the trail. */
export function SaveButton({
  slug, signedIn, initialSaved, save, unsave,
}: {
  slug: string;
  signedIn: boolean;
  initialSaved: boolean;
  save: (slug: string) => Promise<Result>;
  unsave: (slug: string) => Promise<Result>;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const style = "inline-flex min-h-11 items-center rounded-md border border-foreground px-4 text-sm font-medium";

  if (!signedIn) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(`/trails/${slug}`)}`} className={style}>
        Save trail
      </Link>
    );
  }

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setMessage(null);
    try {
      const result = await (next ? save(slug) : unsave(slug));
      if (!result.ok) throw new Error("refused");
    } catch {
      setSaved(!next);
      setMessage(next ? "We couldn't save this trail. Try again." : "We couldn't remove this trail. Try again.");
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} aria-pressed={saved} className={`${style} ${saved ? "bg-accent-subtle" : ""}`}>
        {saved ? "Saved" : "Save trail"}
      </button>
      {message ? <p role="status" className="mt-2 text-sm text-status-stop">{message}</p> : null}
    </div>
  );
}
