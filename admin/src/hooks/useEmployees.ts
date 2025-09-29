"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Timestamp, collection, getDocs } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/config";
import type { EmployeeSummary } from "@/types";

const EMPLOYEE_COLLECTION = "USERS";

type StatusFilter = "all" | "active" | "inactive";

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const fetchEmployees = useCallback(async () => {
    const firestore = getFirebaseFirestore();
    const snapshot = await getDocs(collection(firestore, EMPLOYEE_COLLECTION));

    const results: EmployeeSummary[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAtRaw = data.createdAt;

      return {
        id: doc.id,
        fullName: (data.fullName as string | undefined) ?? "Unnamed",
        email: (data.email as string | undefined) ?? "",
        department: (data.department as string | null | undefined) ?? null,
        position: (data.position as string | null | undefined) ?? null,
        status: data.isActive === false ? "inactive" : "active",
        createdAt:
          createdAtRaw instanceof Timestamp
            ? createdAtRaw.toDate()
            : typeof createdAtRaw?.toDate === "function"
              ? createdAtRaw.toDate()
              : null,
      } satisfies EmployeeSummary;
    });

    results.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    setEmployees(results);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchEmployees();
      setError(null);
    } catch (err) {
      console.error("Failed to load employees", err);
      setError("Unable to load employee records. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [fetchEmployees]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEmployees = useMemo(() => {
    const trimmedQuery = search.trim().toLowerCase();
    const filteredByStatus = employees.filter((employee) => {
      if (status === "all") return true;
      return employee.status === status;
    });

    if (!trimmedQuery) {
      return filteredByStatus;
    }

    return filteredByStatus.filter((employee) => {
      const values = [employee.fullName, employee.email, employee.department ?? "", employee.position ?? ""];
      return values.some((value) => value.toLowerCase().includes(trimmedQuery));
    });
  }, [employees, search, status]);

  return {
    employees: filteredEmployees,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    refresh: load,
  };
}

