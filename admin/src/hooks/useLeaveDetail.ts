"use client";

import { useCallback, useEffect, useState } from "react";

import { Timestamp, doc, getDoc } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { LeaveRequestSummary, LeaveStatus } from "@/types";

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

export function useLeaveDetail(requestId: string) {
  const [record, setRecord] = useState<LeaveRequestSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const firestore = getFirebaseFirestore();
      const ref = doc(firestore, LEAVE_COLLECTION, requestId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setRecord(null);
        setError("Leave request not found.");
        return;
      }

      const data = snap.data();
      const mapped: LeaveRequestSummary = {
        id: snap.id,
        userId: (data.userId as string | undefined) ?? "",
        userName: (data.userName as string | undefined) ?? null,
        userEmail: (data.userEmail as string | undefined) ?? null,
        leaveType: (data.leaveType as string | undefined) ?? "unknown",
        status: (data.status as string | undefined) === "approved" ||
                (data.status as string | undefined) === "rejected" ||
                (data.status as string | undefined) === "cancelled" ||
                (data.status as string | undefined) === "pending"
          ? (data.status as LeaveStatus)
          : "pending",
        startDate: parseTimestamp(data.startDate),
        endDate: parseTimestamp(data.endDate),
        totalDays: (data.totalDays as number | undefined) ?? 0,
        appliedAt: parseTimestamp(data.submittedAt),
        notes: (data.reason as string | undefined) ?? null,
        reviewerNotes: (data.reviewerNotes as string | undefined) ?? null,
      };

      setRecord(mapped);
      setError(null);
    } catch (err) {
      console.error("Failed to load leave detail", err);
      setRecord(null);
      setError("Unable to load leave request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { record, loading, error, refresh: load };
}

