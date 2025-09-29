"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAttendanceRecords } from "@/hooks/useAttendanceRecords";
import { useManualAttendance } from "@/hooks/useManualAttendance";
import type { AttendanceStatus } from "@/types";

const statusFilters: Array<{ value: AttendanceStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day_absent", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
  { value: "late", label: "Late" },
  { value: "early_leave", label: "Early Leave" },
  { value: "missed", label: "Missed" },
];

const statusStyles: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-600",
  absent: "bg-destructive/10 text-destructive",
  half_day_absent: "bg-amber-100 text-amber-600",
  on_leave: "bg-blue-100 text-blue-700",
  late: "bg-orange-100 text-orange-600",
  early_leave: "bg-orange-100 text-orange-600",
  missed: "bg-slate-200 text-slate-600",
};

const formatStatus = (status: string) => status.replace(/_/g, " ");

export default function AttendancePage() {
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: "",
    attendanceDate: "",
    status: "present" as AttendanceStatus | string,
    reason: "",
    notes: "",
  });

  const {
    records,
    loading,
    error,
    search,
    setSearch,
    filters,
    setStatusFilter,
    setDateFilter,
    refresh,
  } = useAttendanceRecords();

  const { submitManualAttendance, loading: manualSubmitting, error: manualError, setError: setManualError } =
    useManualAttendance();

  const statusLabel = useMemo(
    () => statusFilters.find((filter) => filter.value === filters.status)?.label ?? "All",
    [filters.status]
  );

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualForm.userId || !manualForm.attendanceDate || !manualForm.reason || !manualForm.status) {
      setManualError("Please complete all required fields.");
      return;
    }

    try {
      await submitManualAttendance({
        userId: manualForm.userId,
        attendanceDate: manualForm.attendanceDate,
        status: manualForm.status,
        reason: manualForm.reason,
        notes: manualForm.notes || undefined,
      });
      setManualDialogOpen(false);
      setManualForm({ userId: "", attendanceDate: "", status: "present", reason: "", notes: "" });
      await refresh();
    } catch (err) {
      console.error("Manual attendance submission failed", err);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Attendance</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review daily attendance records and manage manual overrides as needed.
              </p>
            </div>
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger>
                <Button type="button">Manual Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader
                  title="Manual Attendance Entry"
                  description="Override or create attendance records with justification."
                />
                <form className="space-y-4" onSubmit={handleManualSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label requiredMarker htmlFor="userId">
                        Employee ID
                      </Label>
                      <Input
                        id="userId"
                        value={manualForm.userId}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, userId: event.target.value }))}
                        placeholder="e.g. UID from USERS"
                        required
                      />
                    </div>
                    <div>
                      <Label requiredMarker htmlFor="attendanceDate">
                        Date (YYYY-MM-DD)
                      </Label>
                      <Input
                        id="attendanceDate"
                        type="date"
                        value={manualForm.attendanceDate}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, attendanceDate: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        id="status"
                        value={manualForm.status}
                        onChange={(event) =>
                          setManualForm((prev) => ({ ...prev, status: event.target.value as AttendanceStatus | string }))
                        }
                      >
                        {statusFilters
                          .filter((option) => option.value !== "all")
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label requiredMarker htmlFor="reason">
                        Reason
                      </Label>
                      <Input
                        id="reason"
                        value={manualForm.reason}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, reason: event.target.value }))}
                        placeholder="Provide justification"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={manualForm.notes}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>

                  {manualError ? <p className="text-sm text-destructive">{manualError}</p> : null}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setManualDialogOpen(false);
                        setManualForm({ userId: "", attendanceDate: "", status: "present", reason: "", notes: "" });
                        setManualError(null);
                      }}
                      disabled={manualSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={manualSubmitting}>
                      {manualSubmitting ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by employee or status"
                  className="w-full sm:w-72"
                />
                <Select
                  value={filters.status ?? "all"}
                  onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | "all")}
                  className="w-40"
                >
                  {statusFilters.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate ? filters.startDate.toISOString().slice(0, 10) : ""}
                    onChange={(event) =>
                      setDateFilter(event.target.value ? new Date(event.target.value) : null, filters.endDate ?? null)
                    }
                  />
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate ? filters.endDate.toISOString().slice(0, 10) : ""}
                    onChange={(event) =>
                      setDateFilter(filters.startDate ?? null, event.target.value ? new Date(event.target.value) : null)
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFilter(null, null);
                  }}
                  disabled={!search && (!filters.status || filters.status === "all") && !filters.startDate && !filters.endDate}
                >
                  Reset filters
                </Button>
                <Button type="button" variant="outline" onClick={() => refresh()} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manual</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Checks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Loading attendance records...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => {
                      const badgeStyle = statusStyles[record.status] ?? "bg-slate-200 text-slate-700";
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.attendanceDate ? record.attendanceDate.toLocaleDateString() : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="font-medium">{record.userName ?? record.userId}</span>
                              <span className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeStyle}`}>
                              {formatStatus(record.status)}
                            </span>
                          </TableCell>
                          <TableCell>{record.isManualEntry ? "Yes" : "No"}</TableCell>
                          <TableCell>{record.notes ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {record.checks && record.checks.length > 0 ? (
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                {record.checks.map((check) => (
                                  <span key={`${record.id}-${check.check}`}>
                                    {check.check}: {check.status ?? "unknown"}
                                    {check.timestamp ? ` @ ${check.timestamp.toLocaleTimeString()}` : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {records.length} record{records.length === 1 ? "" : "s"}. Filters: {statusLabel} status
              {filters.startDate ? `, from ${filters.startDate.toLocaleDateString()}` : ""}
              {filters.endDate ? ` to ${filters.endDate.toLocaleDateString()}` : ""}.
            </p>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

