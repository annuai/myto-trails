// Same alphabet and length as the server's group ride codes (apps/web/src/server/rides/group-rides.ts), so a code that can exist is
// accepted and anything else is turned away before a request is made.
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** The code as typed: spaces and case do not matter. Null when it cannot be a code. */
export function normalizeInviteCode(v: string): string | null {
  const c = v.replace(/\s+/g, '').toUpperCase();
  return CODE.test(c) ? c : null;
}

/** The link a rider shares: an https address, because WhatsApp and SMS only make https links tappable. The page it opens points at the app. */
export const inviteUrl = (siteBase: string, code: string): string => `${siteBase.replace(/\/+$/, '')}/join/${code}`;

/**
 * The code from whatever the rider pasted: an invite link (https or myto://), a whole shared message that contains one, or the bare
 * code. Null when there is no valid code in it.
 */
export function codeFromInvite(text: string): string | null {
  const t = text.trim();
  const inLink = /join\/([A-Za-z0-9]+)/.exec(t)?.[1];
  return normalizeInviteCode(inLink ?? t);
}
