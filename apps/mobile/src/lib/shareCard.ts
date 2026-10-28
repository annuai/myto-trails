import type { ComponentRef } from 'react';
import { Platform, type View } from 'react-native';
import * as Sharing from 'expo-sharing';

/**
 * Saves the card's view as a picture and opens the phone's share sheet, where Instagram, WhatsApp and the rest are listed.
 * The picture is made on the phone and never uploaded. The web has no way to do this, so it says so instead.
 */
export async function shareCard(view: ComponentRef<typeof View> | null): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Ride cards are made in the phone app.');
  if (!view) throw new Error('The card is not ready yet. Try again in a moment.');
  const { captureRef } = await import('react-native-view-shot');
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your ride' });
}
