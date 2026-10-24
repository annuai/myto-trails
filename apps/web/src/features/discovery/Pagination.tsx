import Link from "next/link";
import { PAGE_SIZE, toSearchString, type SearchParams } from "./search-params";

const href = (params: SearchParams, page: number) => {
  const qs = toSearchString({ ...params, page });
  return qs ? `/trails?${qs}` : "/trails";
};

export function Pagination({ params, total }: { params: SearchParams; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const current = params.page;
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 2);
  const linkClass = "inline-flex min-h-11 min-w-11 items-center justify-center px-2 underline underline-offset-4";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1 py-6">
      {current > 1 ? <Link href={href(params, current - 1)} className={linkClass}>Previous page</Link> : null}
      {window.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - window[i - 1]! > 1 ? <span aria-hidden="true" className="px-1 text-muted">…</span> : null}
          {n === current ? (
            <span aria-current="page" className="inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 border-accent px-2 font-medium">{n}</span>
          ) : (
            <Link href={href(params, n)} className={linkClass} aria-label={`Page ${n}`}>{n}</Link>
          )}
        </span>
      ))}
      {current < pages ? <Link href={href(params, current + 1)} className={linkClass}>Next page</Link> : null}
    </nav>
  );
}
