"use client";

import { useCallback, useEffect, useState } from "react";

import { Timestamp, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { EmployeeDetail } from "@/types";

const EMPLOYEE_COLLECTION = "USERS";
const PROFILE_PHOTOS_COLLECTION = "PROFILE_PHOTOS";

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
};

const parseLeaveBalances = (payload: Record<string, unknown>): Record<string, number> => {
  // First check for nested leaveBalances object
  const nestedBalances = payload.leaveBalances as Record<string, number> | undefined;
  if (nestedBalances && typeof nestedBalances === 'object') {
    const balances: Record<string, number> = {};
    for (const [key, value] of Object.entries(nestedBalances)) {
      if (typeof value === 'number') {
        balances[key] = value;
      }
    }
    return balances;
  }

  // Fallback: look for top-level balance fields
  const balances: Record<string, number> = {};
  for (const [key, value] of Object.entries(payload)) {
    if ((key.endsWith("Balance") || key.startsWith("leave")) && typeof value === "number") {
      balances[key] = value;
    }
  }
  return balances;
};

export function useEmployeeDetail(uid: string) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    const firestore = getFirebaseFirestore();
    const ref = doc(firestore, EMPLOYEE_COLLECTION, uid);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error("Employee not found");
    }

    const data = snapshot.data();

    // Fetch active profile photo from PROFILE_PHOTOS collection
    const profilePhotosQuery = query(
      collection(firestore, PROFILE_PHOTOS_COLLECTION),
      where("userId", "==", uid),
      where("status", "==", "active")
    );
    const profilePhotosSnapshot = await getDocs(profilePhotosQuery);

    // Get photoURL from PROFILE_PHOTOS if it exists, otherwise use photoURL from USERS
    const existingPhotoURL = (data.photoURL as string | null | undefined) ?? null;
    const profilePhotoURL = profilePhotosSnapshot.docs[0]?.data()?.publicUrl as string | null | undefined ?? null;
    const finalPhotoURL = existingPhotoURL || profilePhotoURL;

    const leaveBalances = parseLeaveBalances(data);

    const detail: EmployeeDetail = {
      id: snapshot.id,
      fullName: (data.fullName as string | undefined) ?? "Unnamed",
      email: (data.email as string | undefined) ?? "",
      department: (data.department as string | null | undefined) ?? null,
      position: (data.position as string | null | undefined) ?? null,
      phoneNumber: (data.phoneNumber as string | null | undefined) ?? null,
      photoURL: finalPhotoURL,
      status: data.isActive === false ? "inactive" : "active",
      isActive: data.isActive !== false,
      leaveBalances,
      role: (data.role as string | undefined) ?? null,
      createdAt: parseDate(data.createdAt),
    };

    setEmployee(detail);
  }, [uid]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchEmployee();
      setError(null);
    } catch (err) {
      console.error("Failed to load employee detail", err);
      setError(err instanceof Error ? err.message : "Unable to load employee");
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [fetchEmployee]);

  useEffect(() => {
    void load();
  }, [load]);

  return { employee, loading, error, refresh: load };
}

