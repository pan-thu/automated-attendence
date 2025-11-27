"use client";

import { useCallback, useEffect, useState } from "react";

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

import { callGetDashboardStats } from "@/lib/firebase/functions";
import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { DashboardSummary, ViolationSummary } from "@/types";

const buildDefaultSummary = (): DashboardSummary => ({
  totalEmployees: 0,
  attendance: {
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    total: 0,
  },
  pendingLeaves: 0,
  activeViolations: 0,
  recentViolations: [],
});

export function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary>(() => buildDefaultSummary());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const firestore = getFirebaseFirestore();

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const violationsQuery = query(
      collection(firestore, "VIOLATION_HISTORY"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const [statsResponse, violationsSnapshot] = await Promise.all([
      callGetDashboardStats({ date: today }),
      getDocs(violationsQuery),
    ]);

    const statsData = statsResponse.data as
      | {
          totalEmployees?: number;
          attendance?: {
            present?: number;
            absent?: number;
            onLeave?: number;
            halfDay?: number;
            total?: number;
          };
          pendingLeaves?: number;
          activeViolations?: number;
        }
      | undefined;

    const summary: DashboardSummary = buildDefaultSummary();
    summary.totalEmployees = statsData?.totalEmployees ?? 0;
    if (statsData?.attendance) {
      summary.attendance.present = statsData.attendance.present ?? 0;
      summary.attendance.absent = statsData.attendance.absent ?? 0;
      summary.attendance.onLeave = statsData.attendance.onLeave ?? 0;
      summary.attendance.halfDay = statsData.attendance.halfDay ?? 0;
      summary.attendance.total = statsData.attendance.total ?? 0;
    }

    summary.pendingLeaves = statsData?.pendingLeaves ?? 0;
    summary.activeViolations = statsData?.activeViolations ?? 0;
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

    setData(summary);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const startTime = Date.now();
      const MIN_LOADING_TIME = 500; // Show skeleton for at least 500ms

      try {
        await fetchSummary();

        // Ensure minimum loading time for skeleton visibility
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));

        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load dashboard summary", err);

        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));

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

