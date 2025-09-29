"use client";

import { useState } from "react";

import { callToggleUserStatus, callUpdateEmployee } from "@/lib/firebase/functions";
import type { UpdateEmployeePayload } from "@/types";

export function useUpdateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateEmployee(input: UpdateEmployeePayload) {
    setLoading(true);
    setError(null);
    try {
      await callUpdateEmployee(input);
    } catch (err) {
      console.error("Failed to update employee", err);
      const message = err instanceof Error ? err.message : "Failed to update employee.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(uid: string, enable: boolean) {
    setLoading(true);
    setError(null);
    try {
      await callToggleUserStatus({ uid, enable });
    } catch (err) {
      console.error("Failed to toggle employee status", err);
      const message = err instanceof Error ? err.message : "Failed to toggle employee status.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { updateEmployee, changeStatus, loading, error, setError };
}

