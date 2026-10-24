"use server";

import { redirect } from "next/navigation";
import type { DeviceState } from "@/features/account/DeviceForm";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { createToken, revokeToken, TOKEN_KINDS, TOKEN_SCOPES, type TokenKind, type TokenScope } from "@/server/api/tokens";

async function userId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount%2Fdevices");
  return user.id;
}

export async function createDeviceAction(_prev: DeviceState, formData: FormData): Promise<DeviceState> {
  const id = await userId();
  const kind = String(formData.get("kind") ?? "") as TokenKind;
  const scopes = formData.getAll("scopes").map(String).filter((s): s is TokenScope => (TOKEN_SCOPES as readonly string[]).includes(s));
  if (!(TOKEN_KINDS as readonly string[]).includes(kind)) return { error: "Choose a kind of device." };
  const r = await createToken(getSql(), { userId: id, kind, label: String(formData.get("label") ?? ""), scopes });
  if (r.ok) return { token: r.token };
  return { error: r.reason === "too_many" ? "You have ten active devices. Remove one first." : "Give the device a name and choose at least one thing it may do." };
}

export async function revokeDeviceAction(formData: FormData): Promise<void> {
  await revokeToken(getSql(), { userId: await userId(), tokenId: String(formData.get("tokenId") ?? "") });
  redirect("/account/devices");
}
