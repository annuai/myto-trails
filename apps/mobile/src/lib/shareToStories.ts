import { Linking, Platform } from 'react-native';
import { storiesAppId, storiesOptions } from './storiesOptions';

/** Read here, as one plain `process.env.EXPO_PUBLIC_…` reference, so Expo puts the value into the app when it is built. */
const appId = () => storiesAppId(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID);

/** Whether this build can share to Instagram Stories at all: on a phone, with a Facebook App ID set. The button stays hidden otherwise. */
export const storiesAvailable = (): boolean => Platform.OS !== 'web' && !!appId();

/**
 * Hands a picture to Instagram's Stories composer: `backgroundUri` fills the screen, `stickerUri` is a layer the rider can drag and resize
 * (Strava does the same with its transparent stat sticker). The pictures are made on the phone and go straight to Instagram, never to us.
 */
export async function shareToStories(assets: { backgroundUri?: string; stickerUri?: string }): Promise<void> {
  const id = appId();
  if (Platform.OS === 'web' || !id) throw new Error('Sharing to Instagram Stories is not set up in this build.');
  const options = storiesOptions(id, assets);
  const { default: Share, Social } = await import('react-native-share');
  const installed = Platform.OS === 'ios' ? await Linking.canOpenURL('instagram-stories://share') : (await Share.isPackageInstalled('com.instagram.android')).isInstalled;
  if (!installed) throw new Error("Instagram isn't installed on this phone.");
  await Share.shareSingle({ ...options, social: Social.InstagramStories });
}
