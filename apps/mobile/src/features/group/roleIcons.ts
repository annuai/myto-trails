import { Brush, Cross, Flag, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import type { EventRole } from '@/api/types';

/** A small picture for each title a leader can give a rider, shown beside their name on the map and in the lists. */
export const ROLE_ICON: Record<EventRole, LucideIcon> = { captain: Flag, marshal: ShieldCheck, medic: Cross, sweep: Brush };
