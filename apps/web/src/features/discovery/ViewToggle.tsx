import Link from "next/link";
import { toSearchString, type SearchParams } from "./search-params";

const href = (p: SearchParams, view: "list" | "map") => {
  const qs = toSearchString({ ...p, view, page: 1 });
  return qs ? `/trails?${qs}` : "/trails";
};

export function ViewToggle({ params }: { params: SearchParams }) {
  const cls = "inline-flex min-h-11 items-center px-4";
  return (
    <nav aria-label="Result view" className="flex">
      {(["list", "map"] as const).map((view) =>
        params.view === view ? (
          <span key={view} aria-current="page" className={`${cls} border-b-2 border-accent font-medium`}>{view === "list" ? "List" : "Map"}</span>
        ) : (
          <Link key={view} href={href(params, view)} className={`${cls} text-muted underline-offset-4 hover:underline`}>{view === "list" ? "List" : "Map"}</Link>
        ),
      )}
    </nav>
  );
}
