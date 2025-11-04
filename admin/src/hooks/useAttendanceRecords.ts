"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { AttendanceFilter, AttendanceRecordSummary, AttendanceStatus } from "@/types";

const ATTENDANCE_COLLECTION = "ATTENDANCE_RECORDS";

const parseTimestamp = (value: unknown): Date | null => {
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

const normalizeStatus = (value: unknown): string => {
  return typeof value === "string" ? value : "unknown";
};

const extractChecks = (data: Record<string, unknown>): AttendanceRecordSummary["checks"] => {
  const checks: AttendanceRecordSummary["checks"] = [];
  ["check1", "check2", "check3"].forEach((key) => {
    const status = data[`${key}_status`] as string | undefined;
    const timestamp = data[`${key}_timestamp`];
    if (status || timestamp) {
      checks.push({
        check: key,
        status: status ?? null,
        timestamp: parseTimestamp(timestamp),
      });
    }
  });
  return checks.length > 0 ? checks : undefined;
};

export function useAttendanceRecords(initialFilters?: AttendanceFilter) {
  const [records, setRecords] = useState<AttendanceRecordSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filters, setFilters] = useState<AttendanceFilter>({
    startDate: initialFilters?.startDate ?? null,
    endDate: initialFilters?.endDate ?? null,
    status: initialFilters?.status ?? "all",
    userId: initialFilters?.userId,
  });
  const [watchKey, setWatchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const startTime = Date.now();
    const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms

    const firestore = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("attendanceDate", "desc")];

    if (filters.startDate) {
      constraints.push(where("attendanceDate", ">=", Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      constraints.push(where("attendanceDate", "<=", Timestamp.fromDate(filters.endDate)));
    }

    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    const attendanceQuery = query(collection(firestore, ATTENDANCE_COLLECTION), ...constraints);

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const mapped: AttendanceRecordSummary[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: (data.userId as string | undefined) ?? "",
            userName: (data.userName as string | undefined) ?? null,
            userEmail: (data.userEmail as string | undefined) ?? null,
            status: normalizeStatus(data.status),
            attendanceDate: parseTimestamp(data.attendanceDate),
            isManualEntry: data.isManualEntry === true,
            notes: (data.notes as string | undefined) ?? null,
            checks: extractChecks(data),
          } satisfies AttendanceRecordSummary;
        });

        // Ensure minimum loading time for skeleton visibility
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        setTimeout(() => {
          setRecords(mapped);
          setError(null);
          setLoading(false);
        }, remainingTime);
      },
      (err) => {
        console.error("Failed to subscribe to attendance records", err);

        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        setTimeout(() => {
          setRecords([]);
          setError("Unable to load attendance records. Please try again later.");
          setLoading(false);
        }, remainingTime);
      }
    );

    return () => unsubscribe();
  }, [filters, watchKey]);

  const filteredRecords = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      return records;
    }

    return records.filter((record) => {
      const values = [
        record.userId,
        record.userName ?? "",
        record.userEmail ?? "",
        record.status,
        record.notes ?? "",
      ];
      return values.some((value) => value.toLowerCase().includes(trimmed));
    });
  }, [records, search]);

  const setStatusFilter = useCallback((status: AttendanceStatus | "all") => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setDateFilter = useCallback((start: Date | null, end: Date | null) => {
    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const setUserFilter = useCallback((userId: string | undefined) => {
    setFilters((prev) => ({ ...prev, userId }));
  }, []);

  const refresh = useCallback(() => {
    setWatchKey((prev) => prev + 1);
  }, []);

  return {
    records: filteredRecords,
    loading,
    error,
    search,
    setSearch,
    filters,
    setStatusFilter,
    setDateFilter,
    setUserFilter,
    refresh,
  };
}

