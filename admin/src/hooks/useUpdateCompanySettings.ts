"use client";

import { useState } from "react";

import { callUpdateCompanySettings } from "@/lib/firebase/functions";

export function useUpdateCompanySettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCompanySettings(input: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      await callUpdateCompanySettings(input);
    } catch (err) {
      console.error("Failed to update company settings", err);
      const message = err instanceof Error ? err.message : "Failed to update company settings.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { submitCompanySettings, loading, error, setError };
}

