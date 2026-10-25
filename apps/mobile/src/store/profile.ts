import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import { storage } from './persist';

export type Licence = { holder: string; number: string; classes: string[]; validTill?: string; rto?: string };
export type Vehicle = {
  regNo: string; model: string; ownerName: string; rcValidTill?: string;
  insurer?: string; policyNo?: string; insuranceValidTill?: string; pucValidTill?: string;
};
export type Contact = { id: string; name: string; phone: string; relation: string; primary: boolean };
export type Medical = { bloodGroup?: string; notes?: string };

type State = {
  licence?: Licence; vehicle?: Vehicle; contacts: Contact[]; medical: Medical;
  setLicence: (l: Licence | undefined) => void;
  setVehicle: (v: Vehicle | undefined) => void;
  setMedical: (m: Medical) => void;
  addContact: (c: Omit<Contact, 'id' | 'primary'>) => void;
  removeContact: (id: string) => void;
  makePrimary: (id: string) => void;
  wipe: () => void;
};

export const useProfile = create<State>()(
  persist(
    (set) => ({
      contacts: [], medical: {},
      setLicence: (licence) => set({ licence }),
      setVehicle: (vehicle) => set({ vehicle }),
      setMedical: (medical) => set({ medical }),
      addContact: (c) => set((s) => ({ contacts: [...s.contacts, { ...c, id: uid(), primary: s.contacts.length === 0 }] })),
      removeContact: (id) => set((s) => {
        const left = s.contacts.filter((c) => c.id !== id);
        if (left.length && !left.some((c) => c.primary)) left[0] = { ...left[0], primary: true };
        return { contacts: left };
      }),
      makePrimary: (id) => set((s) => ({ contacts: s.contacts.map((c) => ({ ...c, primary: c.id === id })) })),
      wipe: () => set({ licence: undefined, vehicle: undefined, contacts: [], medical: {} }),
    }),
    { name: 'myto-profile', storage },
  ),
);
