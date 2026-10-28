import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import type { DocKind, DocPhoto } from '@/lib/localMedia/types';
import { storage } from './persist';

export type Licence = { holder: string; number: string; classes: string[]; validTill?: string; rto?: string; updatedAt?: number };
export type Vehicle = {
  regNo: string; model: string; ownerName: string; rcValidTill?: string;
  insurer?: string; policyNo?: string; insuranceValidTill?: string; pucValidTill?: string; updatedAt?: number;
};
export type Contact = { id: string; name: string; phone: string; relation: string; primary: boolean; updatedAt?: number };
export type Medical = { bloodGroup?: string; notes?: string; updatedAt?: number };

type State = {
  licence?: Licence; vehicle?: Vehicle; contacts: Contact[]; medical: Medical; /** Metadata of the document photos; the files are in lib/localMedia. */ photos: DocPhoto[];
  setLicence: (l: Licence | undefined) => void;
  setVehicle: (v: Vehicle | undefined) => void;
  setMedical: (m: Medical) => void;
  addContact: (c: Omit<Contact, 'id' | 'primary'>) => void;
  removeContact: (id: string) => void;
  makePrimary: (id: string) => void;
  addPhoto: (p: DocPhoto) => void;
  removePhoto: (id: string) => void;
  photosOf: (docKind: DocKind) => DocPhoto[];
  /** Used by import: overwrite the whole profile. */
  restore: (p: Pick<State, 'licence' | 'vehicle' | 'contacts' | 'medical' | 'photos'>) => void;
  wipe: () => void;
};

export const useProfile = create<State>()(
  persist(
    (set, get) => ({
      contacts: [], medical: {}, photos: [],
      setLicence: (licence) => set({ licence: licence && { ...licence, updatedAt: Date.now() } }),
      setVehicle: (vehicle) => set({ vehicle: vehicle && { ...vehicle, updatedAt: Date.now() } }),
      setMedical: (medical) => set({ medical: { ...medical, updatedAt: Date.now() } }),
      addContact: (c) => set((s) => ({ contacts: [...s.contacts, { ...c, id: uid(), primary: s.contacts.length === 0, updatedAt: Date.now() }] })),
      removeContact: (id) => set((s) => {
        const left = s.contacts.filter((c) => c.id !== id);
        if (left.length && !left.some((c) => c.primary)) left[0] = { ...left[0], primary: true };
        return { contacts: left };
      }),
      makePrimary: (id) => set((s) => ({ contacts: s.contacts.map((c) => ({ ...c, primary: c.id === id })) })),
      addPhoto: (p) => set((s) => ({ photos: [...s.photos, p] })),
      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
      photosOf: (docKind) => get().photos.filter((p) => p.docKind === docKind),
      restore: (p) => set(p),
      wipe: () => set({ licence: undefined, vehicle: undefined, contacts: [], medical: {}, photos: [] }),
    }),
    { name: 'myto-profile', storage },
  ),
);
