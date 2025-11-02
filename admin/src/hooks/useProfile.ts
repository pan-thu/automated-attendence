"use client";

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export interface ProfileData {
  uid: string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role: string | null;
  isActive: boolean;
  leaveBalances?: Record<string, number>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const getOwnProfile = httpsCallable<Record<string, never>, ProfileData>(
        functions,
        "getOwnProfile"
      );

      const result = await getOwnProfile({});

      // Convert timestamp strings to Date objects
      const profileData = {
        ...result.data,
        createdAt: result.data.createdAt ? new Date(result.data.createdAt) : null,
        updatedAt: result.data.updatedAt ? new Date(result.data.updatedAt) : null,
      };

      setProfile(profileData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, error, refetch: fetchProfile };
}
