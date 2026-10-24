"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site";
import { requestSignIn } from "@/server/auth/auth";
import { clientIp, getRequestOrigin, hashIp } from "@/server/auth/request-context";
import { safeNextPath } from "@/server/auth/safe-next";
import { getEmailSender } from "@/server/auth/session";
import { getSql } from "@/server/db/client";

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const h = await headers();
  const baseUrl = getRequestOrigin({
    production: process.env.NODE_ENV === "production",
    siteUrl: getSiteUrl(process.env),
    host: h.get("host"),
    proto: h.get("x-forwarded-proto"),
  });
  const ip = clientIp(h);
  const { status } = await requestSignIn(getSql(), { email, ipHash: ip === "unknown" ? null : hashIp(ip), sender: getEmailSender(), baseUrl, next });
  redirect(status === "rate_limited" ? `/sign-in?limited=1&next=${encodeURIComponent(next)}` : "/sign-in/check-email");
}
