"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, query, where, orderBy, limit as limitQuery, getDocs, Timestamp } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/config";

const PENALTIES_COLLECTION = "PENALTIES";

interface Penalty {
  id: string;
  amount: number;
  reason: string;
  violationDate: Date;
  issuedDate: Date;
  status: "pending" | "acknowledged" | "waived" | "paid";
  violationType: "absent" | "half-absent" | "late" | "early-leave";
  acknowledgedAt?: Date;
  waivedAt?: Date;
  waivedBy?: string;
  waivedReason?: string;
}

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

export function useEmployeePenalties(employeeId: string) {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPenalties = useCallback(async () => {
    const firestore = getFirebaseFirestore();
    const penaltiesCol = collection(firestore, PENALTIES_COLLECTION);

    const q = query(
      penaltiesCol,
      where("userId", "==", employeeId),
      orderBy("dateIncurred", "desc"),
      limitQuery(50)
    );

    const snapshot = await getDocs(q);
    const penaltyList: Penalty[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const violationDate = parseTimestamp(data.dateIncurred);
      const issuedDate = parseTimestamp(data.createdAt);

      if (violationDate && issuedDate) {
        // Map violation types from Firebase to our standard format
        let mappedViolationType = data.violationType;
        if (mappedViolationType === "half_day") mappedViolationType = "half-absent";
        if (mappedViolationType === "early_leave") mappedViolationType = "early-leave";

        penaltyList.push({
          id: doc.id,
          amount: Number(data.amount) || 0,
          reason: data.reason || data.violationType || "Violation",
          violationDate,
          issuedDate,
          status: data.status || "pending",
          violationType: mappedViolationType || "late",
          acknowledgedAt: parseTimestamp(data.acknowledgedAt) || undefined,
          waivedAt: parseTimestamp(data.waivedAt) || undefined,
          waivedBy: data.waivedBy,
          waivedReason: data.waivedReason,
        });
      }
    });

    setPenalties(penaltyList);
  }, [employeeId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPenalties();
      setError(null);
    } catch (err) {
      console.error("Failed to load employee penalties", err);
      setError(err instanceof Error ? err.message : "Unable to load penalties");
      setPenalties([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPenalties]);

  useEffect(() => {
    void load();
  }, [load]);

  return { penalties, loading, error, refresh: load };
}
