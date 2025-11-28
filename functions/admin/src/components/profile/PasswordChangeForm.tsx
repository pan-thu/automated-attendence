"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdatePassword } from "@/hooks/useUpdatePassword";

interface PasswordChangeFormProps {
  onSuccess: () => void;
}

export function PasswordChangeForm({ onSuccess }: PasswordChangeFormProps) {
  const { updatePassword, loading, error } = useUpdatePassword();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (formData.newPassword.length < 6) {
      setValidationError("New password must be at least 6 characters long");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setValidationError("New passwords do not match");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setValidationError("New password must be different from current password");
      return;
    }

    const success = await updatePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    if (success) {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            value={formData.currentPassword}
            onChange={handleChange}
            placeholder="Enter current password"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("current")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.current ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPasswords.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Enter new password"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("new")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.new ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("confirm")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.confirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {(validationError || error) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {validationError || error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
