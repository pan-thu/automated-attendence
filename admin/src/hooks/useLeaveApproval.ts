"use client";

import { useState } from "react";

import { callHandleLeaveApproval } from "@/lib/firebase/functions";
import type { LeaveApprovalPayload } from "@/types";

export function useLeaveApproval() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLeaveDecision(input: LeaveApprovalPayload) {
    setLoading(true);
    setError(null);
    try {
      await callHandleLeaveApproval(input as unknown as Record<string, unknown>);
    } catch (err) {
      console.error("Failed to process leave decision", err);
      const message = err instanceof Error ? err.message : "Failed to process leave decision.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { submitLeaveDecision, loading, error, setError };
}

