"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";
import { User, Lock, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { profile, loading, error, refetch } = useProfile();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePhotoUploaded = () => {
    setSuccessMessage("Profile photo updated successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
    refetch();
  };

  const handleProfileUpdated = () => {
    setSuccessMessage("Profile updated successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
    refetch();
  };

  const handlePasswordUpdated = () => {
    setSuccessMessage("Password updated successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <DashboardLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </DashboardLayout>
      </ProtectedLayout>
    );
  }

  if (error || !profile) {
    return (
      <ProtectedLayout>
        <DashboardLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error || "Failed to load profile"}
            </div>
          </div>
        </DashboardLayout>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {successMessage && (
            <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Overview Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Profile Photo</CardTitle>
                <CardDescription>Update your profile photo</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfilePhotoUpload
                  currentPhotoUrl={profile.photoURL}
                  onPhotoUploaded={handlePhotoUploaded}
                />

                <div className="mt-6 space-y-4 border-t pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Account ID</p>
                    <p className="text-sm font-mono">{profile.uid}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Role</p>
                    <Badge variant="secondary" className="mt-1">
                      {profile.role || "Unknown"}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Badge variant={profile.isActive ? "default" : "destructive"} className="mt-1">
                      {profile.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {profile.createdAt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Member Since</p>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        {profile.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  )}
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
                    <TabsTrigger value="profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="security">
                      <Lock className="mr-2 h-4 w-4" />
                      Security
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="mt-6">
                    <ProfileEditForm
                      profile={profile}
                      onSuccess={handleProfileUpdated}
                    />
                  </TabsContent>

                  <TabsContent value="security" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Change Password</h3>
                        <p className="text-xs text-muted-foreground">
                          Update your password to keep your account secure
                        </p>
                      </div>
                      <PasswordChangeForm onSuccess={handlePasswordUpdated} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Leave Balances (if applicable) */}
          {profile.leaveBalances && Object.keys(profile.leaveBalances).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leave Balances</CardTitle>
                <CardDescription>Your current leave balance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(profile.leaveBalances).map(([key, value]) => (
                    <div key={key} className="rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").replace(/Balance$/, "").trim()}
                      </p>
                      <p className="mt-2 text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">days remaining</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
