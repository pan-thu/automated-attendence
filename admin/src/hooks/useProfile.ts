"use client";

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/config";
import { useAuth } from "./useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
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
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      setLoading(authLoading);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms

      try {
        const app = getFirebaseApp();
        const functions = getFunctions(app);
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

        // Ensure minimum loading time for skeleton visibility
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));

        if (isMounted) {
          setProfile(profileData);
          setError(null);
        }
      } catch (err: unknown) {
        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));

        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to fetch profile";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  return { profile, loading, error, refetch: fetchProfile };
}
