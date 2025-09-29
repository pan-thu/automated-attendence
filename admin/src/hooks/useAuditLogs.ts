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
import type { AuditLogFilter, AuditLogRecord } from "@/types";

const AUDIT_COLLECTION = "AUDIT_LOGS";

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

export function useAuditLogs(initialFilters?: AuditLogFilter) {
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [filters, setFilters] = useState<AuditLogFilter>({
    action: initialFilters?.action ?? "all",
    resource: initialFilters?.resource ?? "all",
    performedBy: initialFilters?.performedBy,
    startDate: initialFilters?.startDate ?? null,
    endDate: initialFilters?.endDate ?? null,
  });
  const [watchKey, setWatchKey] = useState(0);

  useEffect(() => {
    setLoading(true);

    const firestore = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")];

    if (filters.action && filters.action !== "all") {
      constraints.push(where("action", "==", filters.action));
    }

    if (filters.resource && filters.resource !== "all") {
      constraints.push(where("resource", "==", filters.resource));
    }

    if (filters.performedBy) {
      constraints.push(where("performedBy", "==", filters.performedBy));
    }

    if (filters.startDate) {
      constraints.push(where("timestamp", ">=", Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      constraints.push(where("timestamp", "<=", Timestamp.fromDate(filters.endDate)));
    }

    const auditQuery = query(collection(firestore, AUDIT_COLLECTION), ...constraints);

    const unsubscribe = onSnapshot(
      auditQuery,
      (snapshot) => {
        const mapped: AuditLogRecord[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            action: (data.action as string | undefined) ?? "unknown",
            resource: (data.resource as string | undefined) ?? "unknown",
            resourceId: (data.resourceId as string | undefined) ?? "",
            status: (data.status as string | undefined) ?? "unknown",
            performedBy: (data.performedBy as string | undefined) ?? "",
            performedByEmail: (data.performedByEmail as string | undefined) ?? null,
            timestamp: parseTimestamp(data.timestamp),
            oldValues: (data.oldValues as Record<string, unknown> | null | undefined) ?? null,
            newValues: (data.newValues as Record<string, unknown> | null | undefined) ?? null,
            metadata: (data.metadata as Record<string, unknown> | null | undefined) ?? null,
            errorMessage: (data.errorMessage as string | undefined) ?? null,
          } satisfies AuditLogRecord;
        });

        setRecords(mapped);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to audit logs", err);
        setRecords([]);
        setError("Unable to load audit logs. Please try again later.");
        setLoading(false);
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
        record.action,
        record.resource,
        record.resourceId,
        record.status,
        record.performedBy,
        record.performedByEmail ?? "",
        record.errorMessage ?? "",
      ];
      return values.some((value) => value.toLowerCase().includes(trimmed));
    });
  }, [records, search]);

  const setActionFilter = useCallback((action: string | "all") => {
    setFilters((prev) => ({ ...prev, action }));
  }, []);

  const setResourceFilter = useCallback((resource: string | "all") => {
    setFilters((prev) => ({ ...prev, resource }));
  }, []);

  const setDateFilter = useCallback((start: Date | null, end: Date | null) => {
    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const setPerformedByFilter = useCallback((performedBy: string | undefined) => {
    setFilters((prev) => ({ ...prev, performedBy }));
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
    setActionFilter,
    setResourceFilter,
    setDateFilter,
    setPerformedByFilter,
    refresh,
  };
}
