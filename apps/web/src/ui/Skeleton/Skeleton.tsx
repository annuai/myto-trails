import type { ReactNode } from "react";

/** A grey placeholder block shown while content loads. Decorative; the wrapper announces "Loading". */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-card-stone ${className}`} />;
}

/** Wraps a loading screen: one polite "Loading" for screen readers, and marks the region busy. */
export function LoadingScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

export function TrailCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}
