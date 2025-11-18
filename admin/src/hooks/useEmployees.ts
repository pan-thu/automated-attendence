"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { getFirebaseApp, getFirebaseFirestore } from "@/lib/firebase/config";
import type { EmployeeSummary } from "@/types";

const EMPLOYEE_COLLECTION = "USERS";
const PROFILE_PHOTOS_COLLECTION = "PROFILE_PHOTOS";

type StatusFilter = "all" | "active" | "inactive";

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const fetchEmployees = useCallback(async () => {
    const firestore = getFirebaseFirestore();

    // Fetch employees
    const snapshot = await getDocs(collection(firestore, EMPLOYEE_COLLECTION));

    // Fetch active profile photos
    const profilePhotosQuery = query(
      collection(firestore, PROFILE_PHOTOS_COLLECTION),
      where("status", "==", "active")
    );
    const profilePhotosSnapshot = await getDocs(profilePhotosQuery);

    // Create a map of userId to photoURL from PROFILE_PHOTOS
    const profilePhotoMap = new Map<string, string>();
    profilePhotosSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.userId && data.publicUrl) {
        profilePhotoMap.set(data.userId as string, data.publicUrl as string);
      }
    });

    const results: EmployeeSummary[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAtRaw = data.createdAt;

      // Use photoURL from USERS collection if it exists, otherwise fallback to PROFILE_PHOTOS
      const existingPhotoURL = (data.photoURL as string | null | undefined) ?? null;
      const profilePhotoURL = profilePhotoMap.get(doc.id) ?? null;
      const finalPhotoURL = existingPhotoURL || profilePhotoURL;

      return {
        id: doc.id,
        fullName: (data.fullName as string | undefined) ?? "Unnamed",
        email: (data.email as string | undefined) ?? "",
        department: (data.department as string | null | undefined) ?? null,
        position: (data.position as string | null | undefined) ?? null,
        status: data.isActive === false ? "inactive" : "active",
        photoURL: finalPhotoURL,
        role: (data.role as string | null | undefined) ?? null,
        phoneNumber: (data.phoneNumber as string | null | undefined) ?? null,
        leaveBalances: (data.leaveBalances as Record<string, number> | undefined) ?? {},
        createdAt:
          createdAtRaw instanceof Timestamp
            ? createdAtRaw.toDate()
            : typeof createdAtRaw?.toDate === "function"
              ? createdAtRaw.toDate()
              : null,
      } satisfies EmployeeSummary;
    });

    results.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    setEmployees(results);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchEmployees();
      setError(null);
    } catch (err) {
      console.error("Failed to load employees", err);
      setError("Unable to load employee records. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [fetchEmployees]);

  useEffect(() => {
    let isMounted = true; // Bug Fix #16: Track mount status

    const loadData = async () => {
      setLoading(true);
      const startTime = Date.now();
      const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms

      try {
        await fetchEmployees();

        // Ensure minimum loading time for skeleton visibility
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        await new Promise(resolve => setTimeout(resolve, remainingTime));

        if (isMounted) { // Only update if still mounted
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load employees", err);

        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        await new Promise(resolve => setTimeout(resolve, remainingTime));

        if (isMounted) {
          setError("Unable to load employee records. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false; // Cleanup: mark as unmounted
    };
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    const trimmedQuery = search.trim().toLowerCase();
    const filteredByStatus = employees.filter((employee) => {
      if (status === "all") return true;
      return employee.status === status;
    });

    if (!trimmedQuery) {
      return filteredByStatus;
    }

    return filteredByStatus.filter((employee) => {
      const values = [employee.fullName, employee.email, employee.department ?? "", employee.position ?? ""];
      return values.some((value) => value.toLowerCase().includes(trimmedQuery));
    });
  }, [employees, search, status]);

  return {
    employees: filteredEmployees,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    refresh: load,
  };
}

