"use client";

import { useState } from "react";

import { callCreateEmployee } from "@/lib/firebase/functions";
import type { CreateEmployeePayload } from "@/types";

export function useCreateEmployee() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createEmployee(input: CreateEmployeePayload) {
    setLoading(true);
    setError(null);
    try {
      await callCreateEmployee(input);
    } catch (err) {
      console.error("Failed to create employee", err);
      const message = err instanceof Error ? err.message : "Failed to create employee.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { createEmployee, loading, error, setError };
}

