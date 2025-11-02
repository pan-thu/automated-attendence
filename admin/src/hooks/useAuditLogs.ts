"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/config";

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  performedBy: string;
  performedByName?: string;
  targetUserId?: string;
  targetUserName?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface UseAuditLogsOptions {
  maxRecords?: number;
}

export function useAuditLogs({ maxRecords = 10 }: UseAuditLogsOptions = {}) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const firestore = getFirebaseFirestore();

      // Query recent audit logs
      const logsQuery = query(
        collection(firestore, "AUDIT_LOGS"),
        orderBy("timestamp", "desc"),
        limit(maxRecords)
      );

      const snapshot = await getDocs(logsQuery);

      const auditLogs: any[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Parse timestamp
        let timestamp = new Date();
        if (data.timestamp && typeof data.timestamp.toDate === "function") {
          timestamp = data.timestamp.toDate();
        }

        return {
          id: doc.id,
          timestamp,
          action: data.action || "Unknown Action",
          performedBy: data.performedBy || data.adminId || "Unknown",
          performedByName: data.performedByName || data.adminName || undefined,
          performedByEmail: data.performedByEmail || data.adminEmail || undefined,
          targetUserId: data.targetUserId || data.userId || undefined,
          targetUserName: data.targetUserName || data.userName || undefined,
          resource: data.resource || data.collection || undefined,
          resourceId: data.resourceId || data.documentId || undefined,
          status: data.status || "success",
          errorMessage: data.errorMessage || data.error || undefined,
          oldValues: data.oldValues || data.before || undefined,
          newValues: data.newValues || data.after || undefined,
          details: data.details || {},
          metadata: data.metadata || {},
        };
      });

      setRecords(auditLogs);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      setError("Unable to load audit logs. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [maxRecords]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const refresh = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { records, loading, error, refresh };
}
