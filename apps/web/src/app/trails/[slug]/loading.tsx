import { LoadingScreen, Skeleton } from "@/ui/Skeleton/Skeleton";

export default function TrailLoading() {
  return (
    <LoadingScreen className="flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="aspect-[21/9] w-full rounded-3xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-11/12 max-w-prose" />
        <Skeleton className="h-4 w-4/5 max-w-prose" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </LoadingScreen>
  );
}
