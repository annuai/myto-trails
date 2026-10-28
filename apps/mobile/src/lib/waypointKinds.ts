/** What a waypoint marks. A plain waypoint has no kind. */
export type WaypointKind = 'fuel' | 'water' | 'food' | 'hazard';
export const WAYPOINT_KINDS: WaypointKind[] = ['fuel', 'water', 'food', 'hazard'];
export const WAYPOINT_LABEL: Record<WaypointKind, string> = { fuel: 'Fuel', water: 'Water', food: 'Food', hazard: 'Hazard' };
