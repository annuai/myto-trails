// The Moto Trails website is the only backend: its /api/v1 reads the trails database and enforces who may see what.
// A release build has no dev server to point at, so it defaults to the live site; set EXPO_PUBLIC_API_BASE to use another.
// The app never talks to Supabase directly. On an Android emulator use http://10.0.2.2:3000/api/v1 (localhost is the emulator itself).
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? (__DEV__ ? 'http://localhost:3000/api/v1' : 'https://myto-trails.vercel.app/api/v1')).replace(/\/$/, '');
export const SITE_BASE = API_BASE.replace(/\/api\/v1$/, '');
