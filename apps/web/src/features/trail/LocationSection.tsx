import { PinMap } from "@/features/map/PinMap";
import type { TrailDetailDto } from "@/server/queries/types";

/** Degrees with a hemisphere letter: 13.16970° N, 77.48372° E. */
export function formatCoordinates(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? "E" : "W"}`;
}

/**
 * Where the trail starts: the coordinates in words and numbers, a map pin, and links to open the place in other maps.
 * For a sensitive trail the position is only the approximate public point, and the page says so.
 */
export function LocationSection({ trail, showMap = true }: { trail: TrailDetailDto; /** Off when the route map already shows the place. */ showMap?: boolean }) {
  if (!trail.location) return null;
  const { lat, lon } = trail.location;
  const approximate = trail.sensitivity !== "standard";
  const decimal = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const link = "inline-flex min-h-11 items-center underline underline-offset-4";
  return (
    <section aria-labelledby="location" className="flex flex-col gap-4">
      <h2 id="location" className="text-xl font-semibold">{approximate ? "Approximate location" : "Where it starts"}</h2>
      <p>
        <span className="font-mono">{formatCoordinates(lat, lon)}</span>
        <span className="block text-sm text-muted">{approximate ? "The exact start is not published for this trail." : `Decimal: ${decimal}. Near ${trail.nearestTown}.`}</span>
      </p>
      <div className="flex flex-wrap gap-x-6">
        <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noopener noreferrer" className={link}>Open in Google Maps</a>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`} target="_blank" rel="noopener noreferrer" className={link}>Open in OpenStreetMap</a>
      </div>
      {showMap ? <PinMap lon={lon} lat={lat} label={approximate ? `Approximate location of ${trail.name}` : `Start of ${trail.name}`} /> : null}
    </section>
  );
}
