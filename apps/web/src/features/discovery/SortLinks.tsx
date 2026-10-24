import Link from "next/link";
import { SORT_MODES, toSearchString, type SearchParams, type SortMode } from "./search-params";

const LABELS: Record<SortMode, string> = {
  relevance: "Relevance", nearest: "Nearest", recent: "Recently added", distance: "Shortest", difficulty: "Easiest first",
};

export function SortLinks({ params }: { params: SearchParams }) {
  const available = SORT_MODES.filter((m) => (m === "nearest" ? Boolean(params.near) : m === "relevance" ? Boolean(params.q) : true));
  return (
    <nav aria-label="Sort results" className="flex flex-wrap items-center gap-x-1">
      <span className="mr-2 text-sm text-muted">Sort</span>
      {available.map((m) =>
        m === params.sort ? (
          <span key={m} aria-current="true" className="inline-flex min-h-11 items-center border-b-2 border-accent px-3 text-sm font-medium">{LABELS[m]}</span>
        ) : (
          <Link key={m} href={`/trails?${toSearchString({ ...params, sort: m, page: 1 })}`} className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline-offset-4 hover:underline">
            {LABELS[m]}
          </Link>
        ),
      )}
    </nav>
  );
}
