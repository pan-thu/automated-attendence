"use client";

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/config";

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function useUpdatePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePassword = async (payload: UpdatePasswordPayload): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const updateOwnPassword = httpsCallable<
        UpdatePasswordPayload,
        { success: boolean }
      >(functions, "updateOwnPassword");

      await updateOwnPassword(payload);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updatePassword, loading, error };
}
