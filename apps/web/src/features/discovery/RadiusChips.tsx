import Link from "next/link";
import { RADIUS_OPTIONS, toSearchString, type SearchParams } from "./search-params";

export function RadiusChips({ params }: { params: SearchParams }) {
  return (
    <nav aria-label="Search radius" className="flex flex-wrap items-center gap-x-1">
      <span className="mr-2 text-sm text-muted">Within</span>
      {RADIUS_OPTIONS.map((r) =>
        r === params.radius ? (
          <span key={r} aria-current="true" className="inline-flex min-h-11 items-center border-b-2 border-accent px-3 text-sm font-medium">{r} km</span>
        ) : (
          <Link key={r} href={`/trails?${toSearchString({ ...params, radius: r, page: 1 })}`} className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {r} km
          </Link>
        ),
      )}
    </nav>
  );
}
