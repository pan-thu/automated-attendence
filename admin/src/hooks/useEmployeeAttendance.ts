"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, query, where, orderBy, limit as limitQuery, getDocs, Timestamp } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/config";

const ATTENDANCE_COLLECTION = "ATTENDANCE_RECORDS";

interface AttendanceRecord {
  id: string;
  date: Date;
  status: "present" | "absent" | "half-absent" | "late" | "early-leave" | "on-leave" | "weekend" | null;
  check1Status?: string;
  check2Status?: string;
  check3Status?: string;
  check1Timestamp?: Date;
  check2Timestamp?: Date;
  check3Timestamp?: Date;
}

interface TodayAttendance {
  check1?: {
    time?: string;
    status: "on_time" | "late" | "early_leave" | "missed" | "pending";
    location?: { latitude: number; longitude: number };
  };
  check2?: {
    time?: string;
    status: "on_time" | "late" | "early_leave" | "missed" | "pending";
    location?: { latitude: number; longitude: number };
  };
  check3?: {
    time?: string;
    status: "on_time" | "late" | "early_leave" | "missed" | "pending";
    location?: { latitude: number; longitude: number };
  };
  overallStatus?: "present" | "absent" | "half_day" | "on_leave" | "weekend";
  workingHours?: number;
  requiredHours?: number;
}

// Map Firebase status to UI-compatible overall status
const mapOverallStatus = (status: string | null | undefined): "present" | "absent" | "half_day" | "on_leave" | "weekend" | undefined => {
  if (!status) return undefined;
  switch (status) {
    case "present":
    case "in_progress": // Treat in_progress as present (working day)
      return "present";
    case "absent":
      return "absent";
    case "half_day":
    case "half_day_absent":
    case "half-absent":
      return "half_day";
    case "on_leave":
    case "on-leave":
      return "on_leave";
    case "weekend":
      return "weekend";
    default:
      // For late, early_leave etc., they were still present
      return "present";
  }
};

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

const mapCheckStatus = (status: string | undefined): "on_time" | "late" | "early_leave" | "missed" | "pending" => {
  if (!status) return "pending";
  if (status === "on_time") return "on_time";
  if (status === "late") return "late";
  if (status === "early_leave") return "early_leave";
  if (status === "missed") return "missed";
  return "pending";
};

export function useEmployeeAttendance(employeeId: string, monthStart?: Date, monthEnd?: Date) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    const firestore = getFirebaseFirestore();
    const attendanceCol = collection(firestore, ATTENDANCE_COLLECTION);

    // Fetch month's attendance records
    let q = query(
      attendanceCol,
      where("userId", "==", employeeId),
      orderBy("attendanceDate", "desc"),
      limitQuery(100)
    );

    const snapshot = await getDocs(q);
    const records: AttendanceRecord[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const attendanceDate = parseTimestamp(data.attendanceDate);

      if (attendanceDate) {
        // Map status from Firebase to our standard format
        let mappedStatus = data.status;
        if (mappedStatus === "half_day") mappedStatus = "half-absent";
        if (mappedStatus === "early_leave") mappedStatus = "early-leave";
        if (mappedStatus === "on_leave") mappedStatus = "on-leave";

        records.push({
          id: doc.id,
          date: attendanceDate,
          status: mappedStatus || null,
          check1Status: data.check1_status,
          check2Status: data.check2_status,
          check3Status: data.check3_status,
          check1Timestamp: parseTimestamp(data.check1_timestamp) || undefined,
          check2Timestamp: parseTimestamp(data.check2_timestamp) || undefined,
          check3Timestamp: parseTimestamp(data.check3_timestamp) || undefined,
        });
      }
    });

    setAttendanceRecords(records);

    // Get today's attendance
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const todayRecord = records.find(r => r.date.toISOString().slice(0, 10) === todayStr);

    if (todayRecord) {
      const formatTime = (date: Date | undefined) => {
        if (!date) return undefined;
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      };

      setTodayAttendance({
        check1: {
          time: formatTime(todayRecord.check1Timestamp),
          status: mapCheckStatus(todayRecord.check1Status),
        },
        check2: {
          time: formatTime(todayRecord.check2Timestamp),
          status: mapCheckStatus(todayRecord.check2Status),
        },
        check3: {
          time: formatTime(todayRecord.check3Timestamp),
          status: mapCheckStatus(todayRecord.check3Status),
        },
        overallStatus: mapOverallStatus(todayRecord.status),
      });
    } else {
      setTodayAttendance(null);
    }
  }, [employeeId, monthStart, monthEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchAttendance();
      setError(null);
    } catch (err) {
      console.error("Failed to load employee attendance", err);
      setError(err instanceof Error ? err.message : "Unable to load attendance");
      setAttendanceRecords([]);
      setTodayAttendance(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  useEffect(() => {
    void load();
  }, [load]);

  return { attendanceRecords, todayAttendance, loading, error, refresh: load };
}
