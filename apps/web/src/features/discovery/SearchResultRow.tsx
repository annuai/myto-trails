import type { SearchItem } from "@/server/queries/search.sql";
import { TrailRow } from "./TrailRow";
import { TravelTime } from "./TravelTime";

/** A trail row, with distance and approximate travel time when the search has an origin. */
export function SearchResultRow({ trail }: { trail: SearchItem }) {
  return (
    <TrailRow trail={trail}>
      {trail.distanceFromKm !== null && trail.travel ? (
        <TravelTime distanceKm={trail.distanceFromKm} oneWayMin={trail.travel.oneWayMin} roundTripMin={trail.travel.roundTripMin} />
      ) : null}
    </TrailRow>
  );
}
