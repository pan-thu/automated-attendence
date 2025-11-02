"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export interface UpdateProfilePayload {
  fullName?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: Record<string, number>;
}

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (payload: UpdateProfilePayload): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const updateOwnProfile = httpsCallable<
        UpdateProfilePayload,
        { success: boolean }
      >(functions, "updateOwnProfile");

      await updateOwnProfile(payload);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
}
