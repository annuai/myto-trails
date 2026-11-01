import type { Contact, Licence, Medical, Vehicle } from '@/store/profile';

export type CardFact = { label: string; value: string; /** False when the rider has not filled it in, so the card can show it quietly. */ set: boolean };
export type CardContact = { name: string; phone: string; relation: string; primary: boolean };
export type EmergencyCardData = { name: string; facts: CardFact[]; notes: string | null; bike: string | null; contacts: CardContact[] };

const NOT_SET = 'Not set';
/** Enough to ring, not so many that the card stops being readable at a glance. */
const MAX_CONTACTS = 3;

/**
 * What a responder needs from the rider's phone, in the order they need it: who this is, blood group, organ donor, anything
 * medical, the bike, and who to call. Everything comes from what the rider keeps on this device, so it works with no signal.
 * A donor answer left blank reads "Not set", never "No".
 */
export function emergencyCard(i: { displayName?: string | null; licence?: Pick<Licence, 'holder'>; medical: Medical; vehicle?: Pick<Vehicle, 'model' | 'regNo'>; contacts: Contact[] }): EmergencyCardData {
  const name = i.displayName?.trim() || i.licence?.holder.trim() || 'Rider';
  const blood = i.medical.bloodGroup?.trim();
  const donor = i.medical.organDonor;
  const notes = i.medical.notes?.trim();
  const bike = i.vehicle ? [i.vehicle.model.trim(), i.vehicle.regNo.trim()].filter(Boolean).join(' · ') : '';
  const contacts = [...i.contacts].sort((a, b) => Number(b.primary) - Number(a.primary)).slice(0, MAX_CONTACTS).map((c) => ({ name: c.name, phone: c.phone, relation: c.relation, primary: c.primary }));
  return {
    name,
    facts: [
      { label: 'Blood group', value: blood || NOT_SET, set: !!blood },
      { label: 'Organ donor', value: donor === undefined ? NOT_SET : donor ? 'Yes' : 'No', set: donor !== undefined },
    ],
    notes: notes || null,
    bike: bike || null,
    contacts,
  };
}
