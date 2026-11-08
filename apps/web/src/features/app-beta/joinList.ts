import { getWaitlistUrl } from "@/lib/site";

export type JoinState = { error: string | null; success: boolean; email?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add someone to the app list, which myto-moto.com keeps. Sent from our server, tagged with the site they signed up on. */
export async function joinList(
  input: { email: string; platform: string; honeypot: string },
  env: Record<string, string | undefined> = process.env,
  send: typeof fetch = fetch,
): Promise<JoinState> {
  // People never fill the hidden field; bots do. Say thanks and drop it.
  if (input.honeypot) return { error: null, success: true };
  const email = input.email.toLowerCase().trim();
  if (!email || email.length > 254 || !EMAIL.test(email)) return { error: "Enter a valid email address.", success: false };

  const url = getWaitlistUrl(env);
  if (!url) return { error: "Signing up is not available right now. Please try again later.", success: false };
  try {
    const res = await send(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, platform: input.platform, source: "moto-trails" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { error: "Something went wrong. Please try again.", success: false };
    return { error: null, success: true };
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }
}
