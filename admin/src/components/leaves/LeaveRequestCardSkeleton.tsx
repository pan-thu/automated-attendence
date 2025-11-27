import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function LeaveRequestCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Leave Details */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </Card>
  );
}
