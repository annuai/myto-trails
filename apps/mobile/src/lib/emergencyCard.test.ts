import { describe, expect, it } from 'vitest';
import { emergencyCard } from './emergencyCard';

const contact = (name: string, primary = false) => ({ id: name, name, phone: '+919800000000', relation: '', primary });

describe('emergencyCard', () => {
  it('shows the rider, blood group, donor answer, notes, bike and contacts', () => {
    const card = emergencyCard({
      displayName: 'Asha', medical: { bloodGroup: 'O+', organDonor: true, notes: ' Penicillin allergy ' },
      vehicle: { model: 'Himalayan', regNo: 'KA 01 AB 1234' }, contacts: [contact('Ravi'), contact('Amma', true)],
    });
    expect(card.name).toBe('Asha');
    expect(card.facts).toEqual([{ label: 'Blood group', value: 'O+', set: true }, { label: 'Organ donor', value: 'Yes', set: true }]);
    expect(card.notes).toBe('Penicillin allergy');
    expect(card.bike).toBe('Himalayan · KA 01 AB 1234');
    expect(card.contacts.map((c) => c.name)).toEqual(['Amma', 'Ravi']);
  });

  it('reads an unanswered donor question as not set, and an explicit no as no', () => {
    expect(emergencyCard({ medical: {}, contacts: [] }).facts[1]).toEqual({ label: 'Organ donor', value: 'Not set', set: false });
    expect(emergencyCard({ medical: { organDonor: false }, contacts: [] }).facts[1]).toEqual({ label: 'Organ donor', value: 'No', set: true });
  });

  it('falls back to the licence holder, then to Rider, for the name', () => {
    expect(emergencyCard({ displayName: '  ', licence: { holder: 'Asha K' }, medical: {}, contacts: [] }).name).toBe('Asha K');
    expect(emergencyCard({ displayName: null, medical: {}, contacts: [] }).name).toBe('Rider');
  });

  it('leaves out what is missing, and shows blood group as not set', () => {
    const card = emergencyCard({ displayName: 'Asha', medical: { notes: '   ' }, contacts: [] });
    expect(card.facts[0]).toEqual({ label: 'Blood group', value: 'Not set', set: false });
    expect(card.notes).toBeNull();
    expect(card.bike).toBeNull();
    expect(card.contacts).toEqual([]);
  });

  it('shows at most three contacts, the main one first', () => {
    const card = emergencyCard({ displayName: 'A', medical: {}, contacts: [contact('a'), contact('b'), contact('c'), contact('d', true)] });
    expect(card.contacts.map((c) => c.name)).toEqual(['d', 'a', 'b']);
  });

  it('shows only the bike detail it has', () => {
    expect(emergencyCard({ displayName: 'A', medical: {}, vehicle: { model: '', regNo: 'KA 01' }, contacts: [] }).bike).toBe('KA 01');
  });
});
