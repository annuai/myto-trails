"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccount, isDeleteConfirmed } from "@/server/account/delete";
import { SESSION_COOKIE } from "@/server/auth/session-cookie";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { getStorage } from "@/server/storage";

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount%2Fdelete");
  if (!isDeleteConfirmed(formData.get("confirm"))) redirect("/account/delete?error=confirm");
  const result = await deleteAccount(getSql(), getStorage(), user.id);
  if (!result.ok) redirect("/account/delete?error=club");
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/account/deleted");
}
