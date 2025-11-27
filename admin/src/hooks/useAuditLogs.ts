"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/config";

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  performedBy: string;
  performedByName?: string;
  performedByEmail?: string;
  targetUserId?: string;
  targetUserName?: string;
  resource?: string;
  resourceId?: string;
  status?: string;
  errorMessage?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface UseAuditLogsOptions {
  maxRecords?: number;
}

interface UserInfo {
  name?: string;
  email?: string;
}

// Cache for user info to avoid repeated lookups
const userInfoCache: Record<string, UserInfo> = {};

async function getUserInfo(firestore: ReturnType<typeof getFirebaseFirestore>, userId: string): Promise<UserInfo> {
  if (!userId) return {};

  // Check cache first
  if (userInfoCache[userId]) {
    return userInfoCache[userId];
  }

  try {
    const userDoc = await getDoc(doc(firestore, "USERS", userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const info: UserInfo = {
        name: data.fullName || data.displayName || data.name || undefined,
        email: data.email || undefined,
      };
      userInfoCache[userId] = info;
      return info;
    }
  } catch {
    // Silently fail - will show ID instead
  }

  return {};
}

export function useAuditLogs({ maxRecords = 10 }: UseAuditLogsOptions = {}) {
  const [records, setRecords] = useState<AuditLog[]>([]);
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

      // First pass: map basic data
      const rawLogs = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Parse timestamp
        let timestamp = new Date();
        if (data.timestamp && typeof data.timestamp.toDate === "function") {
          timestamp = data.timestamp.toDate();
        } else if (data.createdAt && typeof data.createdAt.toDate === "function") {
          timestamp = data.createdAt.toDate();
        }

        // Extract target info from metadata or direct fields
        const metadata = data.metadata || {};
        const targetUserId = data.targetUserId || metadata.targetUserId || metadata.userId || undefined;
        const targetUserName = data.targetUserName || metadata.targetUserName || metadata.userName || metadata.fullName || undefined;

        // Build details from available fields
        const details: Record<string, any> = {};
        if (data.resource) details.resource = data.resource;
        if (data.resourceId) details.resourceId = data.resourceId;
        if (data.status) details.status = data.status;
        if (data.reason) details.reason = data.reason;
        if (metadata.action) details.action = metadata.action;
        if (metadata.requestId) details.requestId = metadata.requestId;

        // Add old/new values summary
        if (data.oldValues && Object.keys(data.oldValues).length > 0) {
          details.changes = `${Object.keys(data.oldValues).length} field(s) modified`;
        }
        if (data.newValues && Object.keys(data.newValues).length > 0) {
          Object.entries(data.newValues).slice(0, 2).forEach(([key, value]) => {
            details[key] = typeof value === 'object' ? JSON.stringify(value).substring(0, 30) : String(value).substring(0, 30);
          });
        }

        return {
          id: doc.id,
          timestamp,
          action: data.action || "unknown_action",
          performedBy: data.performedBy || "unknown",
          performedByName: data.performedByName || undefined,
          targetUserId,
          targetUserName,
          resource: data.resource,
          resourceId: data.resourceId,
          status: data.status || "success",
          errorMessage: data.errorMessage || data.error || undefined,
          oldValues: data.oldValues || undefined,
          newValues: data.newValues || undefined,
          details: Object.keys(details).length > 0 ? details : undefined,
          metadata,
        };
      });

      // Second pass: fetch missing user names
      const userIdsToFetch = new Set<string>();
      rawLogs.forEach(log => {
        if (log.performedBy && !log.performedByName && log.performedBy !== "unknown") {
          userIdsToFetch.add(log.performedBy);
        }
        if (log.targetUserId && !log.targetUserName) {
          userIdsToFetch.add(log.targetUserId);
        }
      });

      // Fetch user info in parallel
      const userInfoPromises = Array.from(userIdsToFetch).map(async (userId) => {
        const info = await getUserInfo(firestore, userId);
        return { userId, info };
      });

      const userInfos = await Promise.all(userInfoPromises);
      const userInfoMap: Record<string, UserInfo> = {};
      userInfos.forEach(({ userId, info }) => {
        userInfoMap[userId] = info;
      });

      // Third pass: apply fetched user info
      const auditLogs: AuditLog[] = rawLogs.map(log => ({
        ...log,
        performedByName: log.performedByName || userInfoMap[log.performedBy]?.name || undefined,
        performedByEmail: userInfoMap[log.performedBy]?.email || undefined,
        targetUserName: log.targetUserName || (log.targetUserId ? userInfoMap[log.targetUserId]?.name : undefined),
      }));

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
