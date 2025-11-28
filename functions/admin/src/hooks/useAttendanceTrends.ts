"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase/config";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isFuture,
} from "date-fns";

export interface AttendanceTrendData {
  date: string;
  dateKey: string; // YYYY-MM-DD format for matching
  present: number;
  absent: number;
  halfAbsent: number;
  late: number;
  earlyLeave: number;
  onLeave: number;
  isFuture: boolean;
}

interface UseAttendanceTrendsOptions {
  year: number;
  month: number; // 0-indexed (0 = January, 11 = December)
}

export function useAttendanceTrends({ year, month }: UseAttendanceTrendsOptions) {
  const [data, setData] = useState<AttendanceTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const firestore = getFirebaseFirestore();

      // Create date range for the selected month
      const monthStart = startOfMonth(new Date(year, month));
      const monthEnd = endOfMonth(new Date(year, month));

      // Get all days in the month
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Query attendance records for this month using attendanceDate field
      const attendanceQuery = query(
        collection(firestore, "ATTENDANCE_RECORDS"),
        where("attendanceDate", ">=", Timestamp.fromDate(monthStart)),
        where("attendanceDate", "<=", Timestamp.fromDate(monthEnd))
      );

      const snapshot = await getDocs(attendanceQuery);

      // Create a map to aggregate data by date
      const dataByDate = new Map<string, {
        present: number;
        absent: number;
        halfAbsent: number;
        late: number;
        earlyLeave: number;
        onLeave: number;
      }>();

      // Process each attendance record
      snapshot.docs.forEach((doc) => {
        const record = doc.data();

        // Parse date from document - try attendanceDate first, then date
        let recordDate: Date | null = null;
        if (record.attendanceDate && typeof record.attendanceDate.toDate === "function") {
          recordDate = record.attendanceDate.toDate();
        } else if (record.date && typeof record.date.toDate === "function") {
          recordDate = record.date.toDate();
        }

        if (!recordDate) return;

        const dateKey = format(recordDate, "yyyy-MM-dd");

        if (!dataByDate.has(dateKey)) {
          dataByDate.set(dateKey, {
            present: 0,
            absent: 0,
            halfAbsent: 0,
            late: 0,
            earlyLeave: 0,
            onLeave: 0,
          });
        }

        const dayData = dataByDate.get(dateKey)!;
        const status = (record.status as string)?.toLowerCase();

        // Categorize based on Firebase status values
        switch (status) {
          case "present":
          case "in_progress":
            dayData.present++;
            break;
          case "absent":
            dayData.absent++;
            break;
          case "half_day_absent":
          case "half_day":
          case "half-absent":
          case "halfday":
            dayData.halfAbsent++;
            break;
          case "late":
            dayData.late++;
            break;
          case "early_leave":
          case "early-leave":
          case "earlyleave":
            dayData.earlyLeave++;
            break;
          case "on_leave":
          case "on-leave":
          case "onleave":
            dayData.onLeave++;
            break;
        }
      });

      // Build final data array with all days in month
      const trendsData: AttendanceTrendData[] = allDays.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayData = dataByDate.get(dateKey) || {
          present: 0,
          absent: 0,
          halfAbsent: 0,
          late: 0,
          earlyLeave: 0,
          onLeave: 0,
        };

        return {
          date: format(day, "MMM dd"),
          dateKey,
          present: dayData.present,
          absent: dayData.absent,
          halfAbsent: dayData.halfAbsent,
          late: dayData.late,
          earlyLeave: dayData.earlyLeave,
          onLeave: dayData.onLeave,
          isFuture: isFuture(day),
        };
      });

      setData(trendsData);
    } catch (err) {
      console.error("Failed to fetch attendance trends", err);
      setError("Unable to load attendance trends. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const refresh = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { data, loading, error, refresh };
}
