import { CardListSkeleton, LoadingScreen, Skeleton } from "@/ui/Skeleton/Skeleton";

export default function Loading() {
  return (
    <LoadingScreen className="flex max-w-3xl flex-col gap-6 py-8">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <CardListSkeleton count={3} />
    </LoadingScreen>
  );
}
