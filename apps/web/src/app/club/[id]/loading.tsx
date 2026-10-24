import { LoadingScreen, Skeleton } from "@/ui/Skeleton/Skeleton";

export default function ClubDetailLoading() {
  return (
    <LoadingScreen className="flex max-w-3xl flex-col gap-6 py-8">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-32 rounded-3xl" />
    </LoadingScreen>
  );
}
