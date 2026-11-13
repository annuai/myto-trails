"use server";

import { joinList, type JoinState } from "@/features/app-beta/joinList";

export async function joinListAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const email = String(formData.get("email") ?? "");
  const result = await joinList({ email, platform: String(formData.get("platform") ?? ""), honeypot: String(formData.get("website") ?? "") });
  // Hand the address back on a failure so the field is not emptied.
  return result.success ? result : { ...result, email };
}
