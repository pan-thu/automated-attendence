"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/config";

interface GenerateUploadUrlPayload {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface GenerateUploadUrlResult {
  photoId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  uploadUrlExpiresAt: string;
}

interface RegisterPhotoPayload {
  photoId: string;
}

interface RegisterPhotoResult {
  photoId: string;
  photoURL: string;
}

export function useProfilePhoto() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);

      // Step 1: Generate upload URL
      const generateUploadUrl = httpsCallable<
        GenerateUploadUrlPayload,
        GenerateUploadUrlResult
      >(functions, "generateProfilePhotoUploadUrl");

      const uploadUrlResult = await generateUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      const { photoId, uploadUrl, uploadHeaders } = uploadUrlResult.data;

      // Step 2: Upload file to Cloud Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photo to storage");
      }

      setUploadProgress(50);

      // Step 3: Register the photo
      const registerPhoto = httpsCallable<RegisterPhotoPayload, RegisterPhotoResult>(
        functions,
        "registerProfilePhoto"
      );

      const registerResult = await registerPhoto({ photoId });
      setUploadProgress(100);

      return registerResult.data.photoURL;
    } catch (err: unknown) {
      let message = "Failed to upload profile photo";

      if (err instanceof Error) {
        // Check for service account error (emulator issue)
        if (err.message.includes("client_email") || err.message.includes("sign data")) {
          message = "Profile photo upload is not available in local development. Please deploy to production to enable this feature.";
        } else {
          message = err.message;
        }
      }

      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadPhoto, loading, error, uploadProgress };
}
