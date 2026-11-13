import { inkSolid } from '@/theme/tokens';

/** What Instagram's Stories composer is given: a background layer (a photo, or one solid colour) and a sticker layer the rider can move and resize. */
export type StoriesOptions = { appId: string; backgroundImage?: string; stickerImage?: string; backgroundTopColor?: string; backgroundBottomColor?: string };

/**
 * The Facebook App ID Instagram requires from any app that shares to Stories (since January 2023; without it Instagram says the app
 * "doesn't currently support sharing to Stories"). An App ID is public, not a secret. Anything that is not digits means "not set up".
 */
export const storiesAppId = (value: string | undefined): string | undefined => {
  const id = value?.trim();
  return id && /^\d{6,20}$/.test(id) ? id : undefined;
};

/** The options for one share. A sticker with no background gets one solid colour (the same top and bottom) so it does not land on Instagram's default grey. */
export function storiesOptions(appId: string, assets: { backgroundUri?: string; stickerUri?: string }): StoriesOptions {
  const { backgroundUri, stickerUri } = assets;
  if (!backgroundUri && !stickerUri) throw new Error('There is nothing to share to Stories.');
  return {
    appId,
    ...(backgroundUri ? { backgroundImage: backgroundUri } : {}),
    ...(stickerUri ? { stickerImage: stickerUri } : {}),
    ...(!backgroundUri ? { backgroundTopColor: inkSolid, backgroundBottomColor: inkSolid } : {}),
  };
}
