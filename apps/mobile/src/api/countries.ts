import { api } from './client';

/** A country as the website lists it. `comingSoon` countries are shown but not yet open for trails, clubs or rides. */
export type Country = { iso2: string; name: string; slug: string; enabled: boolean; comingSoon: boolean };

/** What the app assumes before (or without) an answer from the server: India is open, nothing else is. */
export const FALLBACK_COUNTRIES: Country[] = [{ iso2: 'IN', name: 'India', slug: 'india', enabled: true, comingSoon: false }];

export const fetchCountries = async (signal?: AbortSignal): Promise<Country[]> => (await api<{ countries: Country[] }>('/countries', { signal })).countries;

/** "Tell me once when it opens." Sends the email and nothing else; the server keeps it only to send that one message. */
export const registerInterest = (iso2: string, email: string): Promise<void> => api<void>(`/countries/${encodeURIComponent(iso2)}/interest`, { method: 'POST', body: { email } });
