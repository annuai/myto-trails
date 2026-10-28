import { media, radius } from '@/theme/tokens';

/** Thumbnail tiles of document photos, the viewer's zoom limit and its icon size. */
export const documentPhoto = {
  thumbWidth: 96,
  thumbHeight: 72,
  thumbRadius: radius.thumb,
  addIcon: 24,
  maxZoom: 5,
  viewerIcon: media.avatarSm / 2,
} as const;
