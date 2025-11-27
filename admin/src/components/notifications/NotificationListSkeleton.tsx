import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface NotificationListSkeletonProps {
  count?: number;
}

export function NotificationListSkeleton({ count = 8 }: NotificationListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
