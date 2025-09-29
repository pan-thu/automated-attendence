"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Timestamp,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { DashboardSummary, ViolationSummary } from "@/types";

const buildDefaultSummary = (): DashboardSummary => ({
  attendance: {
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    total: 0,
  },
  pendingLeaves: 0,
  recentViolations: [],
});

export function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary>(() => buildDefaultSummary());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const firestore = getFirebaseFirestore();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    const attendanceQuery = query(
      collection(firestore, "ATTENDANCE_RECORDS"),
      where("attendanceDate", ">=", startTimestamp),
      where("attendanceDate", "<=", endTimestamp)
    );

    const leaveQuery = query(
      collection(firestore, "LEAVE_REQUESTS"),
      where("status", "==", "pending")
    );

    const violationsQuery = query(
      collection(firestore, "VIOLATION_HISTORY"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const [attendanceSnapshot, leaveSnapshot, violationsSnapshot] = await Promise.all([
      getDocs(attendanceQuery),
      getDocs(leaveQuery),
      getDocs(violationsQuery),
    ]);

    const summary: DashboardSummary = buildDefaultSummary();
    summary.attendance.total = attendanceSnapshot.size;
    summary.pendingLeaves = leaveSnapshot.size;
    summary.recentViolations = violationsSnapshot.docs.map((doc) => {
      const payload = doc.data();

      const createdAtValue = payload.createdAt;
      const createdAt =
        createdAtValue && typeof createdAtValue.toDate === "function"
          ? createdAtValue.toDate()
          : null;

      return {
        id: doc.id,
        violationType: (payload.violationType as string | undefined) ?? "unknown",
        createdAt,
        monthlyCount:
          typeof payload.monthlyCount === "number"
            ? payload.monthlyCount
            : undefined,
        penaltyTriggered:
          typeof payload.penaltyTriggered === "boolean"
            ? payload.penaltyTriggered
            : undefined,
      } satisfies ViolationSummary;
    });

    attendanceSnapshot.forEach((doc) => {
      const status = (doc.get("status") as string | undefined)?.toLowerCase();

      switch (status) {
        case "present":
          summary.attendance.present += 1;
          break;
        case "absent":
          summary.attendance.absent += 1;
          break;
        case "on_leave":
          summary.attendance.onLeave += 1;
          break;
        case "half_day_absent":
        case "half-day":
          summary.attendance.halfDay += 1;
          break;
        default:
          break;
      }
    });

    setData(summary);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await fetchSummary();
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
        if (!cancelled) {
          setError("Unable to load dashboard data. Try again later.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetchSummary();
    } catch (err) {
      console.error("Failed to refresh dashboard summary", err);
      setError("Unable to refresh dashboard data. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [fetchSummary]);

  return { data, loading, error, refresh };
}

