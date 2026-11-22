// The arrow drawn for each kind of turn.

import { ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, MapPin, RefreshCw, Undo2, type LucideIcon } from 'lucide-react-native';
import type { TurnKind } from '@/lib/turnByTurn';

/** The icon for each turn kind. */
export const TURN_ICON: Record<TurnKind, LucideIcon> = {
  straight: ArrowUp, left: ArrowLeft, right: ArrowRight, 'slight left': ArrowUpLeft, 'slight right': ArrowUpRight,
  'sharp left': ArrowDownLeft, 'sharp right': ArrowDownRight, uturn: Undo2, roundabout: RefreshCw, arrive: MapPin,
};
