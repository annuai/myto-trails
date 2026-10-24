import { headers } from "next/headers";
import { FooterClock } from "./FooterClock";
import { placeFromHeaders } from "./place-from-headers";

/** Reads the request's approximate location from the hosting platform (nothing is stored). Render inside Suspense. */
export async function FooterLocation() {
  const h = await headers();
  return <FooterClock place={placeFromHeaders(h)} />;
}
