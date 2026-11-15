"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { initAnalytics, pageView } from "@/lib/analytics";

/** Starts usage statistics and sends a page view (as a route pattern) on each navigation. Renders nothing. See `lib/analytics`. */
export function Analytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => { void initAnalytics().then(setReady); }, []);
  useEffect(() => { if (ready) pageView(pathname); }, [ready, pathname]);
  return null;
}
