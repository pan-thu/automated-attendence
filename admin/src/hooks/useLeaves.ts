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
import type { LeaveFilter, LeaveRequestSummary, LeaveStatus } from "@/types";

const LEAVE_COLLECTION = "LEAVE_REQUESTS";

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

const normalizeStatus = (value: unknown): LeaveStatus => {
  return value === "approved" || value === "rejected" ? (value as LeaveStatus) : "pending";
};

export function useLeaves(initialFilters?: LeaveFilter) {
  const [records, setRecords] = useState<LeaveRequestSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [watchKey, setWatchKey] = useState(0);
  const [filters, setFilters] = useState<LeaveFilter>({
    status: initialFilters?.status ?? "all",
    userId: initialFilters?.userId,
    startDate: initialFilters?.startDate ?? null,
    endDate: initialFilters?.endDate ?? null,
  });

  useEffect(() => {
    setLoading(true);

    const firestore = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("appliedAt", "desc")];

    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (filters.startDate) {
      constraints.push(where("startDate", ">=", Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      constraints.push(where("endDate", "<=", Timestamp.fromDate(filters.endDate)));
    }

    const leavesQuery = query(collection(firestore, LEAVE_COLLECTION), ...constraints);

    const unsubscribe = onSnapshot(
      leavesQuery,
      (snapshot) => {
        const mapped: LeaveRequestSummary[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: (data.userId as string | undefined) ?? "",
            userName: (data.userName as string | undefined) ?? null,
            userEmail: (data.userEmail as string | undefined) ?? null,
            leaveType: (data.type as string | undefined) ?? (data.leaveType as string | undefined) ?? "unknown",
            status: normalizeStatus(data.status),
            startDate: parseTimestamp(data.startDate),
            endDate: parseTimestamp(data.endDate),
            totalDays: (data.totalDays as number | undefined) ?? 0,
            appliedAt: parseTimestamp(data.appliedAt),
            notes: (data.reason as string | undefined) ?? (data.notes as string | undefined) ?? null,
            reviewerNotes: (data.reviewerNotes as string | undefined) ?? null,
          } satisfies LeaveRequestSummary;
        });

        setRecords(mapped);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to leave requests", err);
        setRecords([]);
        setError("Unable to load leave requests. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters, watchKey]);

  const refresh = useCallback(() => {
    setWatchKey((prev) => prev + 1);
  }, []);

  const filteredRecords = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      return records;
    }

    return records.filter((record) => {
      const values = [
        record.userName ?? "",
        record.userEmail ?? "",
        record.leaveType,
        record.status,
        record.notes ?? "",
        record.reviewerNotes ?? "",
      ];
      return values.some((value) => value.toLowerCase().includes(trimmed));
    });
  }, [records, search]);

  const setStatusFilter = useCallback((status: LeaveStatus | "all") => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setDateFilter = useCallback((start: Date | null, end: Date | null) => {
    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const setUserFilter = useCallback((userId: string | undefined) => {
    setFilters((prev) => ({ ...prev, userId }));
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
