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
import type { NotificationFilter, NotificationRecord } from "@/types";

const NOTIFICATIONS_COLLECTION = "NOTIFICATIONS";

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

export function useNotifications(initialFilters?: NotificationFilter) {
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filters, setFilters] = useState<NotificationFilter>({
    category: initialFilters?.category ?? "all",
    type: initialFilters?.type ?? "all",
    userId: initialFilters?.userId,
    isRead: initialFilters?.isRead ?? "all",
    startDate: initialFilters?.startDate ?? null,
    endDate: initialFilters?.endDate ?? null,
  });
  const [watchKey, setWatchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const startTime = Date.now();
    const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms

    const firestore = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("sentAt", "desc")];

    if (filters.category && filters.category !== "all") {
      constraints.push(where("category", "==", filters.category));
    }

    if (filters.type && filters.type !== "all") {
      constraints.push(where("type", "==", filters.type));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (filters.isRead !== undefined && filters.isRead !== "all") {
      constraints.push(where("isRead", "==", filters.isRead));
    }

    if (filters.startDate) {
      constraints.push(where("sentAt", ">=", Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      constraints.push(where("sentAt", "<=", Timestamp.fromDate(filters.endDate)));
    }

    const notificationsQuery = query(collection(firestore, NOTIFICATIONS_COLLECTION), ...constraints);

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const mapped: NotificationRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: (data.userId as string | undefined) ?? "",
            userName: (data.userName as string | undefined) ?? null,
            userEmail: (data.userEmail as string | undefined) ?? null,
            title: (data.title as string | undefined) ?? "Untitled",
            message: (data.message as string | undefined) ?? "",
            category: (data.category as string | undefined) ?? null,
            type: (data.type as string | undefined) ?? null,
            isRead: data.isRead === true,
            sentAt: parseTimestamp(data.sentAt),
            readAt: parseTimestamp(data.readAt),
            relatedId: (data.relatedId as string | undefined) ?? null,
            relatedType: (data.relatedType as string | undefined) ?? null,
            metadata: (data.metadata as Record<string, unknown> | null | undefined) ?? null,
          } satisfies NotificationRecord;
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
        console.error("Failed to subscribe to notifications", err);

        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        setTimeout(() => {
          setRecords([]);
          setError("Unable to load notifications. Please try again later.");
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
        record.userName ?? "",
        record.userEmail ?? "",
        record.title,
        record.message,
        record.category ?? "",
        record.type ?? "",
        record.relatedId ?? "",
      ];
      return values.some((value) => value.toLowerCase().includes(trimmed));
    });
  }, [records, search]);

  const setCategoryFilter = useCallback((category: string | "all") => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setTypeFilter = useCallback((type: string | "all") => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  const setIsReadFilter = useCallback((isRead: boolean | "all") => {
    setFilters((prev) => ({ ...prev, isRead }));
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
    setCategoryFilter,
    setTypeFilter,
    setIsReadFilter,
    setDateFilter,
    setUserFilter,
    refresh,
  };
}
