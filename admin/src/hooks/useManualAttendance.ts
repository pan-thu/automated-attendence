"use client";

import { useState } from "react";

import { callManualSetAttendance } from "@/lib/firebase/functions";
import type { ManualAttendancePayload } from "@/types";

export function useManualAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitManualAttendance(input: ManualAttendancePayload) {
    setLoading(true);
    setError(null);
    try {
      await callManualSetAttendance(input);
    } catch (err) {
      console.error("Failed to submit manual attendance", err);
      const message = err instanceof Error ? err.message : "Failed to submit manual attendance.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { submitManualAttendance, loading, error, setError };
}

