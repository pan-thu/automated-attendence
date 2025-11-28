"use client";

import { useEffect, useState } from "react";

import { Timestamp, doc, onSnapshot } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { CompanySettings } from "@/types";

const SETTINGS_DOC = "COMPANY_SETTINGS/main";

const parseDate = (value: unknown): Date | null => {
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

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firestore = getFirebaseFirestore();
    const ref = doc(firestore, SETTINGS_DOC);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSettings(null);
          setError(null);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        const mapped: CompanySettings = {
          companyName: (data.companyName as string | undefined) ?? undefined,
          timezone: (data.timezone as string | undefined) ?? undefined,
          workplace_center: data.workplace_center
            ? {
                latitude: data.workplace_center.latitude,
                longitude: data.workplace_center.longitude,
              }
            : null,
          workplace_radius: (data.workplace_radius as number | undefined) ?? null,
          timeWindows: (data.timeWindows as CompanySettings["timeWindows"]) ?? undefined,
          gracePeriods: (data.gracePeriods as Record<string, number> | undefined) ?? undefined,
          penaltyRules: (data.penaltyRules as CompanySettings["penaltyRules"]) ?? null,
          leavePolicy: (data.leavePolicy as Record<string, number> | undefined) ?? undefined,
          workingDays: (data.workingDays as Record<string, boolean> | undefined) ?? undefined,
          holidays: (Array.isArray(data.holidays) ? (data.holidays as string[]) : undefined) ?? undefined,
          geoFencingEnabled: (data.geoFencingEnabled as boolean | undefined) ?? undefined,
          maxLeaveAttachmentSizeMb: (data.maxLeaveAttachmentSizeMb as number | undefined) ?? null,
          allowedLeaveAttachmentTypes: Array.isArray(data.allowedLeaveAttachmentTypes)
            ? (data.allowedLeaveAttachmentTypes as string[])
            : undefined,
          leaveAttachmentRequiredTypes: Array.isArray(data.leaveAttachmentRequiredTypes)
            ? (data.leaveAttachmentRequiredTypes as string[])
            : undefined,
          updatedAt: parseDate(data.updatedAt),
          updatedBy: (data.updatedBy as string | undefined) ?? null,
        };

        setSettings(mapped);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to company settings", err);
        setSettings(null);
        setError("Unable to load settings. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { settings, loading, error };
}

