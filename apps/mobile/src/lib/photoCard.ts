import { CARD_PAD } from './cardMap';
import type { CardModel } from './rideCard';

export type PhotoLayout = 'bar' | 'corner';
export type OverlayInk = 'light' | 'dark';
/** x, y = the overlay's centre as fractions of the picture's width and height. */
export type Placement = { x: number; y: number; scale: number };
type Size = { width: number; height: number };

export const PLACEMENT_LIMITS = { minScale: 0.6, maxScale: 2.2 } as const;

const PICTURE_WIDTH = 1080;
const BAR_HEIGHT = { route: 300, plain: 190 };
const CORNER = { width: 540, route: 400, perStat: 130, pad: 40 };

/** The overlay's size in picture pixels at scale 1. */
export function overlayBox(layout: PhotoLayout, model: Pick<CardModel, 'stats' | 'route'>): Size {
  if (layout === 'bar') return { width: PICTURE_WIDTH - 2 * CARD_PAD, height: model.route ? BAR_HEIGHT.route : BAR_HEIGHT.plain };
  return { width: CORNER.width, height: (model.route ? CORNER.route : 0) + CORNER.perStat * model.stats.length + CORNER.pad };
}

const finite = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);

/**
 * Clamping rules (no rounding anywhere; values stay exact fractions):
 * - scale is limited to PLACEMENT_LIMITS (a non-finite scale becomes 1);
 * - the whole scaled box then stays inside the picture, with no margin (the margin CARD_PAD only applies to defaultPlacement);
 * - on an axis where the scaled box is as large as or larger than the picture, the centre is 0.5.
 */
export function clampPlacement(p: Placement, box: Size, card: Size): Placement {
  const scale = Math.min(PLACEMENT_LIMITS.maxScale, Math.max(PLACEMENT_LIMITS.minScale, finite(p.scale, 1)));
  const axis = (centre: number, extent: number) => {
    const half = extent / 2;
    if (!(extent > 0) || half * 2 >= 1) return 0.5;
    return Math.min(1 - half, Math.max(half, finite(centre, 0.5)));
  };
  return { x: axis(p.x, (box.width * scale) / card.width), y: axis(p.y, (box.height * scale) / card.height), scale };
}

/** Bar: bottom-centred; corner: top-left; both CARD_PAD from the edges (centred on an axis the box overflows). */
export function defaultPlacement(layout: PhotoLayout, card: Size, box: Size): Placement {
  const x = layout === 'bar' ? 0.5 : (CARD_PAD + box.width / 2) / card.width;
  const y = layout === 'bar' ? (card.height - CARD_PAD - box.height / 2) / card.height : (CARD_PAD + box.height / 2) / card.height;
  return clampPlacement({ x, y, scale: 1 }, box, card);
}

/** dx, dy in picture pixels. */
export function dragPlacement(p: Placement, dx: number, dy: number, box: Size, card: Size): Placement {
  return clampPlacement({ ...p, x: p.x + dx / card.width, y: p.y + dy / card.height }, box, card);
}

export function pinchPlacement(start: Placement, factor: number, box: Size, card: Size): Placement {
  return clampPlacement({ ...start, scale: start.scale * factor }, box, card);
}
