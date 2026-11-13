import { shareAsync } from 'expo-sharing';

/**
 * The seam to the photo composer (branch feat/photo-share-card): takes a photo on the phone and the ride whose stats go on it.
 * Until the composer is on main it shares the picture alone through the system share sheet. The picture is a re-encoded
 * bitmap (never the camera's file), so it carries no EXIF location. When the composer lands, open it here instead.
 */
export async function openPhotoComposer({ uri }: { uri: string; rideId?: string }): Promise<void> {
  await shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share photo' });
}
