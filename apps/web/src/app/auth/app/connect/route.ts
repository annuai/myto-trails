import { allowedRedirects, createAppCode, isAllowedRedirect, isChallenge } from "@/server/auth/app-auth";
import { getCurrentUser } from "@/server/auth/session";
import { isSameOrigin } from "@/server/auth/same-origin";
import { getSql } from "@/server/db/client";

const see = (location: string) => new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

/**
 * "Connect the app" is a plain form POST answered with a 303 to our own page /auth/app/done, which carries the app's link
 * (myto://auth?code=…) in the fragment and opens it. Redirecting the form straight to myto:// is blocked by the form-action
 * rule of our content security policy and is unreliable on iOS.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return new Response("Cross-site request refused.", { status: 403 });
  const form = await request.formData();
  const challenge = String(form.get("challenge") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "").slice(0, 200);
  if (!isChallenge(challenge) || !isAllowedRedirect(redirectUri, allowedRedirects(process.env))) return see("/");
  const user = await getCurrentUser();
  if (!user) return see(`/sign-in?next=${encodeURIComponent(`/auth/app?challenge=${encodeURIComponent(challenge)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`)}`);
  const code = await createAppCode(getSql(), { userId: user.id, challenge });
  const sep = redirectUri.includes("?") ? "&" : "?";
  const target = `${redirectUri}${sep}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  return see(`/auth/app/done#u=${encodeURIComponent(target)}`);
}
