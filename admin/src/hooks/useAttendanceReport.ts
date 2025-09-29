"use client";

import { useState } from "react";

import { callGenerateAttendanceReport } from "@/lib/firebase/functions";
import type { AttendanceReportFilters, AttendanceReportRecord } from "@/types";

export function useAttendanceReport() {
  const [records, setRecords] = useState<AttendanceReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runReport(filters: AttendanceReportFilters) {
    setLoading(true);
    setError(null);
    try {
      const response = await callGenerateAttendanceReport(filters);
      const data = response.data as { records?: Array<Record<string, unknown>> };
      const mapped: AttendanceReportRecord[] = (data.records ?? []).map((entry) => ({
        id: (entry.id as string | undefined) ?? crypto.randomUUID(),
        userId: (entry.userId as string | undefined) ?? "",
        userName: (entry.userName as string | undefined) ?? null,
        userEmail: (entry.userEmail as string | undefined) ?? null,
        attendanceDate: entry.attendanceDate ? new Date(entry.attendanceDate as string) : null,
        status: (entry.status as string | undefined) ?? "unknown",
        department: (entry.department as string | undefined) ?? null,
        position: (entry.position as string | undefined) ?? null,
        isManualEntry: entry.isManualEntry === true,
        reason: (entry.reason as string | undefined) ?? null,
        notes: (entry.notes as string | undefined) ?? null,
      }));
      setRecords(mapped);
    } catch (err) {
      console.error("Failed to generate attendance report", err);
      const message = err instanceof Error ? err.message : "Failed to generate attendance report.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { records, loading, error, runReport };
}

