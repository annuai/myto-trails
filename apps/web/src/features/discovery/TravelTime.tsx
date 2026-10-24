import { formatDuration } from "../trail/labels";

/** Distance and an estimated travel time. The "≈" is deliberate: this is not a routed time. */
export function TravelTime({ distanceKm, oneWayMin, roundTripMin }: { distanceKm: number; oneWayMin: number; roundTripMin: number }) {
  if (distanceKm < 1) return <p className="text-sm">Under 1 km away</p>;
  return (
    <p className="text-sm">
      <span>{Math.round(distanceKm)} km away</span>
      <span aria-hidden="true"> · </span>
      <span>≈ {formatDuration(oneWayMin)} each way</span>
      <span aria-hidden="true"> · </span>
      <span>round trip ≈ {formatDuration(roundTripMin)}</span>
    </p>
  );
}
