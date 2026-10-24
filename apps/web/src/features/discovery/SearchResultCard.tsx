import type { SearchItem } from "@/server/queries/search.sql";
import { TrailCard } from "./TrailCard";
import { TravelTime } from "./TravelTime";

/** A trail row, with distance and approximate travel time when the search has an origin. */
export function SearchResultCard({ trail }: { trail: SearchItem }) {
  return (
    <TrailCard trail={trail}>
      {trail.distanceFromKm !== null && trail.travel ? (
        <TravelTime distanceKm={trail.distanceFromKm} oneWayMin={trail.travel.oneWayMin} roundTripMin={trail.travel.roundTripMin} />
      ) : null}
    </TrailCard>
  );
}
