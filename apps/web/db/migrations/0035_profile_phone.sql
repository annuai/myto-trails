-- A rider's own optional phone number, for their own record. It is stored encrypted (AES-256-GCM, the same box as club join
-- requests), is not verified, and is never shown to any other rider or returned by any club, member or rider response; only the
-- owner reads it back (GET /me, the account page). It goes with the account: deleting the app_user row deletes the column's value.

alter table app_user add column phone_ciphertext text;
