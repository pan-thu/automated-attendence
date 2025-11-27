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
import type { PenaltyFilter, PenaltyRecord, PenaltyStatus } from "@/types";

const PENALTIES_COLLECTION = "PENALTIES";

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

const normalizeStatus = (value: unknown): PenaltyStatus => {
  if (typeof value === "string") {
    if (value === "waived" || value === "disputed" || value === "paid" || value === "active") {
      return value;
    }
  }
  return "active";
};

export function usePenalties(initialFilters?: PenaltyFilter) {
  const [records, setRecords] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filters, setFilters] = useState<PenaltyFilter>({
    status: initialFilters?.status ?? "all",
    userId: initialFilters?.userId,
    startDate: initialFilters?.startDate ?? null,
    endDate: initialFilters?.endDate ?? null,
  });
  const [watchKey, setWatchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const startTime = Date.now();
    const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | undefined;

    const firestore = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("dateIncurred", "desc")];

    if (filters.status && filters.status !== "all") {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (filters.startDate) {
      constraints.push(where("dateIncurred", ">=", Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      constraints.push(where("dateIncurred", "<=", Timestamp.fromDate(filters.endDate)));
    }

    const penaltiesQuery = query(collection(firestore, PENALTIES_COLLECTION), ...constraints);

    const unsubscribe = onSnapshot(
      penaltiesQuery,
      (snapshot) => {
        const mapped: PenaltyRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: (data.userId as string | undefined) ?? "",
            userName: (data.userName as string | undefined) ?? null,
            userEmail: (data.userEmail as string | undefined) ?? null,
            violationType: (data.violationType as string | undefined) ?? "unknown",
            amount: typeof data.amount === "number" ? data.amount : 0,
            status: normalizeStatus(data.status),
            dateIncurred: parseTimestamp(data.dateIncurred),
            waivedAt: parseTimestamp(data.waivedAt),
            waivedReason: (data.waivedReason as string | undefined) ?? null,
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
            notes: (data.notes as string | undefined) ?? null,
          } satisfies PenaltyRecord;
        });

        // Ensure minimum loading time for skeleton visibility
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        timeoutId = setTimeout(() => {
          if (isMounted) {
            setRecords(mapped);
            setError(null);
            setLoading(false);
          }
        }, remainingTime);
      },
      (err) => {
        console.error("Failed to subscribe to penalties", err);

        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        timeoutId = setTimeout(() => {
          if (isMounted) {
            setRecords([]);
            setError("Unable to load penalties. Please try again later.");
            setLoading(false);
          }
        }, remainingTime);
      }
    );

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [filters, watchKey]);

  const filteredRecords = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      return records;
    }

    return records.filter((record) => {
      const values = [
        record.userName ?? "",
        record.userEmail ?? "",
        record.violationType,
        record.status,
        record.waivedReason ?? "",
        String(record.amount),
      ];
      return values.some((value) => value.toLowerCase().includes(trimmed));
    });
  }, [records, search]);

  const setStatusFilter = useCallback((status: PenaltyStatus | "all") => {
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
