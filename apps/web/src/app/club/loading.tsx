import { CardListSkeleton, LoadingScreen, Skeleton } from "@/ui/Skeleton/Skeleton";

export default function ClubLoading() {
  return (
    <LoadingScreen className="flex max-w-3xl flex-col gap-8 py-8">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <Skeleton className="h-6 w-32" />
      <CardListSkeleton />
      <Skeleton className="h-6 w-32" />
      <CardListSkeleton count={2} />
    </LoadingScreen>
  );
}
