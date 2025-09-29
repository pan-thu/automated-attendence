import { getFunctions, httpsCallable, type Functions } from "firebase/functions";

import { getFirebaseApp } from "@/lib/firebase/config";

let functionsInstance: Functions | null = null;

const getCallableInstance = () => {
  if (typeof window === "undefined") {
    throw new Error("Firebase Functions are only available in the browser environment.");
  }

  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp());
  }

  return functionsInstance;
};

export async function callCreateEmployee(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "createEmployee");
  return callable(payload);
}

export async function callUpdateEmployee(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "updateEmployee");
  return callable(payload);
}

export async function callToggleUserStatus(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "toggleUserStatus");
  return callable(payload);
}

export async function callManualSetAttendance(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "manualSetAttendance");
  return callable(payload);
}

export async function callHandleLeaveApproval(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "handleLeaveApproval");
  return callable(payload);
}

export async function callUpdateCompanySettings(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "updateCompanySettings");
  return callable(payload);
}

export async function callGenerateAttendanceReport(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "generateAttendanceReport");
  return callable(payload);
}

export async function callWaivePenalty(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "waivePenalty");
  return callable(payload);
}

export async function callSendNotification(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "sendNotification");
  return callable(payload);
}

export async function callSendBulkNotification(payload: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>>(getCallableInstance(), "sendBulkNotification");
  return callable(payload);
}

