"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const GIVE_UP_MS = 15_000;
const FADE_MS = 700;

/** True for a plain left click on a link to another page of this site (not new tab, download, hash-only or same page). */
function leavesPage(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * A thin line along the top of the window, YouTube style: it starts the moment a link to another page is clicked,
 * creeps towards the end, and completes when the new page arrives. Decorative; the page itself is what screen readers get.
 */
export function NavProgress() {
  const key = `${usePathname()}?${useSearchParams().toString()}`;
  const keyRef = useRef(key);
  const giveUp = useRef<number | undefined>(undefined);
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!leavesPage(e)) return;
      window.clearTimeout(giveUp.current);
      setFrom(keyRef.current);
      giveUp.current = window.setTimeout(() => setFrom(null), GIVE_UP_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(giveUp.current);
    };
  }, []);

  const arrived = from !== null && from !== key;
  useEffect(() => {
    if (!arrived) return;
    window.clearTimeout(giveUp.current);
    const t = window.setTimeout(() => setFrom(null), FADE_MS);
    return () => window.clearTimeout(t);
  }, [arrived]);

  const state = from === null ? "idle" : arrived ? "done" : "loading";
  const style =
    state === "loading"
      ? { width: "85%", opacity: 1, transition: "width 10s cubic-bezier(0.1, 0.6, 0.2, 1)" }
      : state === "done"
        ? { width: "100%", opacity: 0, transition: "width 150ms ease-out, opacity 400ms ease 150ms" }
        : { width: "0%", opacity: 0, transition: "none" };
  return <div data-testid="nav-progress" data-state={state} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] bg-accent" style={style} />;
}
