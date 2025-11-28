import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>Update your profile photo</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-9 w-32" />
            </div>

            {/* Account Info */}
            <div className="mt-6 space-y-4 border-t pt-4">
              <div>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>

              <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>

              <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>

              <div>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Account Settings</CardTitle>
            <CardDescription>
              Update your personal information and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" disabled>
                  <Skeleton className="h-4 w-16" />
                </TabsTrigger>
                <TabsTrigger value="security" disabled>
                  <Skeleton className="h-4 w-16" />
                </TabsTrigger>
              </TabsList>

              {/* Form Fields Skeleton */}
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Balances</CardTitle>
          <CardDescription>Your current leave balance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-4">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-12 mt-2" />
                <Skeleton className="h-3 w-28 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
