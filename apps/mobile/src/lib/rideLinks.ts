/** The group ride and check-in that were live when a ride finished, so the saved ride can point at them. Nothing when there were none. */
export function companionLinks(c: { group?: { id: string } | null; checkin?: { id: string } | null }): { groupId?: string; checkinId?: string } | undefined {
  const links = { ...(c.group ? { groupId: c.group.id } : {}), ...(c.checkin ? { checkinId: c.checkin.id } : {}) };
  return Object.keys(links).length ? links : undefined;
}
