/** What the "Ride home" card shows, or null when there is nothing to offer (then the card renders nothing). */
export function offerCardView(r: { offer: unknown; copy?: { title: string; body: string } }): { title: string; body: string } | null {
  return r.offer && r.copy ? r.copy : null;
}
