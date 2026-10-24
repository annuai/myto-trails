import { notFound } from "next/navigation";
import { requireUser } from "../auth/session";
import { getSql } from "../db/client";
import { getActor, type Actor } from "./actor";

/** For moderation pages: sign-in first, then a 404 (not a 403) for anyone without the role, so the area is not discoverable. */
export async function requireModerator(returnTo: string): Promise<Actor> {
  const user = await requireUser(returnTo);
  const actor = await getActor(getSql(), user.id);
  if (!actor) notFound();
  return actor;
}

export async function requireAdmin(returnTo: string): Promise<Actor> {
  const actor = await requireModerator(returnTo);
  if (actor.role !== "admin") notFound();
  return actor;
}
