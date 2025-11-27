"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import type { ProfileData } from "@/hooks/useProfile";

interface ProfileEditFormProps {
  profile: ProfileData;
  onSuccess: () => void;
}

export function ProfileEditForm({ profile, onSuccess }: ProfileEditFormProps) {
  const { updateProfile, loading, error } = useUpdateProfile();

  const [formData, setFormData] = useState({
    fullName: profile.fullName || "",
    department: profile.department || "",
    position: profile.position || "",
    phoneNumber: profile.phoneNumber || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await updateProfile({
      fullName: formData.fullName || undefined,
      department: formData.department || undefined,
      position: formData.position || undefined,
      phoneNumber: formData.phoneNumber || undefined,
    });

    if (success) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={profile.email || ""}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          placeholder="Enter your department"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <Input
          id="position"
          name="position"
          value={formData.position}
          onChange={handleChange}
          placeholder="Enter your position"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="Enter your phone number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={profile.role || ""}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Role cannot be changed
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
