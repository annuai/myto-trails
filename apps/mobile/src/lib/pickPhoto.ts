import * as ImagePicker from 'expo-image-picker';
import { CARD_SIZE, type CardFormat } from './rideCard';

export type PickedPhoto = { uri: string; width: number; height: number };
export type PickResult = { ok: true; photo: PickedPhoto } | { ok: false; reason: 'cancelled' | 'denied' | 'failed'; message: string };

/**
 * Let the rider choose or take a photo for the share card. The system crop is on and matches the format's shape,
 * so the picture already fits the card; location data is not read from the photo (exif off).
 */
export async function pickCardPhoto(source: 'library' | 'camera', format: CardFormat): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied', message: 'The camera is turned off for Myto Moto. Allow it in your phone settings.' };
    }
    const { width, height } = CARD_SIZE[format];
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [width, height], quality: 1, exif: false };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const a = r.assets?.[0];
    if (r.canceled || !a) return { ok: false, reason: 'cancelled', message: '' };
    return { ok: true, photo: { uri: a.uri, width: a.width, height: a.height } };
  } catch {
    return { ok: false, reason: 'failed', message: 'Could not get that photo. Try another one.' };
  }
}
