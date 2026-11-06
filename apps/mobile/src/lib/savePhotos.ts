import { Directory, File, Paths } from 'expo-file-system';
// The legacy entry: from SDK 58 the package's main entry keeps these functions only to throw.
import * as MediaLibrary from 'expo-media-library/legacy';
import { Linking, Platform } from 'react-native';

/**
 * Saves photos (the 2048-pixel copies) to the phone's photo library. Asks permission to add photos only, the first time.
 * In a browser there is no library, so the picture opens for the person to save from there.
 */
export async function savePhotos(urls: string[]): Promise<{ saved: number; problem?: string }> {
  if (Platform.OS === 'web') { for (const u of urls) void Linking.openURL(u); return { saved: urls.length }; }
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return { saved: 0, problem: 'Allow Photos in Settings to save pictures.' };
  const dir = new Directory(Paths.cache, 'saved-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  let saved = 0;
  try {
    for (const url of urls) {
      const file: File = await File.downloadFileAsync(url, dir, { idempotent: true } as never);
      try { await MediaLibrary.saveToLibraryAsync(file.uri); saved++; } finally { if (file.exists) file.delete(); }
    }
  } catch {
    return { saved, problem: saved ? `Saved ${saved} of ${urls.length}. The rest could not be downloaded.` : 'The photo could not be downloaded. Check your connection.' };
  }
  return { saved };
}

export const savedText = (n: number) => (n === 1 ? 'Saved to your photos' : `Saved ${n} photos to your photos`);
