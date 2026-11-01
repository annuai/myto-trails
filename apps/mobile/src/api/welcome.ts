import { api } from './client';
import type { MyProfile } from './types';

/** The one-time welcome step: the 18+ and licence declaration, the rider's name, gender and phone. Replaces the website's welcome page. */
export const sendWelcome = (token: string, body: { confirmed: true; displayName: string; public: boolean; gender: MyProfile['gender']; phone?: string }) =>
  api<MyProfile>('/me/welcome', { method: 'POST', token, body });

/** Sets or clears the signed-in rider's picture (a finished upload's media id, or null). */
export const setMyAvatar = (token: string, mediaId: string | null) => api<void>('/me/avatar', { method: 'PUT', token, body: { mediaId } });
