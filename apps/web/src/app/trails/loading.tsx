import { LoadingScreen, Skeleton, TrailCardSkeleton } from "@/ui/Skeleton/Skeleton";

export default function TrailsLoading() {
  return (
    <LoadingScreen className="flex flex-col gap-6 py-8">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-12 w-full max-w-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <TrailCardSkeleton key={i} />)}
      </div>
    </LoadingScreen>
  );
}
