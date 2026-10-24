import { LoadingScreen, Skeleton } from "@/ui/Skeleton/Skeleton";

export default function Loading() {
  return (
    <LoadingScreen className="flex flex-col gap-6 py-8">
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <Skeleton className="h-4 w-5/6 max-w-prose" />
      <Skeleton className="h-4 w-3/4 max-w-prose" />
    </LoadingScreen>
  );
}
