"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COUNTRY_COOKIE, parseCountryCookie } from "@/server/geo/detect-country";
import { registerInterest } from "@/server/countries/countries";
import { getCountries } from "@/server/countries/queries";
import { clientIp, hashIp } from "@/server/auth/request-context";
import { getSql } from "@/server/db/client";

/** The visitor picks the country they are browsing. Only open countries can be chosen. */
export async function chooseCountryAction(formData: FormData): Promise<void> {
  const iso2 = parseCountryCookie(String(formData.get("country") ?? ""));
  const open = (await getCountries()).find((c) => c.iso2 === iso2 && c.enabled);
  if (open) (await cookies()).set(COUNTRY_COOKIE, open.iso2, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  redirect("/trails");
}

/** "Tell me when Moto Trails opens in my country": one email, once, for that purpose only. */
export async function notifyMeAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const country = (await getCountries()).find((c) => c.slug === slug);
  if (!country) redirect("/countries");
  const ip = clientIp(await headers());
  const r = await registerInterest(getSql(), { iso2: country.iso2, email: formData.get("email"), ipHash: ip === "unknown" ? "unknown" : hashIp(ip) });
  const status = r.ok ? "saved" : r.reason === "rate_limited" ? "limited" : r.reason === "invalid" ? "invalid" : "error";
  redirect(`/regions/${country.slug}?notify=${status}`);
}
