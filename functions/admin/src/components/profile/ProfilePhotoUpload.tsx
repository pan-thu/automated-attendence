"use client";

import { useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  onPhotoUploaded: (url: string) => void;
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
}: ProfilePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadPhoto, loading, error, uploadProgress } = useProfilePhoto();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload photo
    const photoURL = await uploadPhoto(file);
    if (photoURL) {
      onPhotoUploaded(photoURL);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-32 w-32 overflow-hidden rounded-full bg-muted">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <span className="text-sm font-medium text-white">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={loading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        disabled={loading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Uploading..." : "Change Photo"}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, or WebP. Max 10MB.
      </p>
    </div>
  );
}
