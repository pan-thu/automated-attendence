"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useLeaves } from "@/hooks/useLeaves";
import type { LeaveStatus } from "@/types";

const statusFilters: Array<{ value: LeaveStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
};

const formatDate = (value: Date | null) => (value ? value.toLocaleDateString() : "Unknown");

export default function LeavesPage() {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { records, loading, error, search, setSearch, filters, setStatusFilter, setDateFilter } = useLeaves();

  const selectedRecord = useMemo(() => records.find((record) => record.id === detailId) ?? null, [records, detailId]);

  const statusLabel = useMemo(
    () => statusFilters.find((filter) => filter.value === filters.status)?.label ?? "All",
    [filters.status]
  );

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Leaves</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review pending and historical leave requests for employees.
              </p>
            </div>
          </header>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by employee, status, or type"
                  className="w-full sm:w-72"
                />
                <Select
                  value={filters.status ?? "all"}
                  onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | "all")}
                  className="w-36"
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
                    <TableHead>Applied</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Loading leave requests...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.appliedAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{record.userName ?? record.userId}</span>
                            <span className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{record.leaveType.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          {formatDate(record.startDate)} - {formatDate(record.endDate)}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[record.status] ?? "bg-slate-200 text-slate-700"}`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{record.totalDays}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 text-sm"
                            onClick={() => setDetailId(record.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Showing {records.length} request{records.length === 1 ? "" : "s"}. Status filter: {statusLabel}.
            </p>
          </section>

          <Dialog open={detailId !== null && Boolean(selectedRecord)} onOpenChange={(open) => (!open ? setDetailId(null) : null)}>
            <DialogContent>
              <DialogHeader title="Leave Request" description="Review the details before taking action." />
              {selectedRecord ? (
                <div className="space-y-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{selectedRecord.userName ?? selectedRecord.userId}</h2>
                      <p className="text-xs text-muted-foreground">{selectedRecord.userEmail ?? "No email"}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[selectedRecord.status] ?? "bg-slate-200 text-slate-700"}`}
                    >
                      {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                    </span>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Leave type</dt>
                      <dd className="mt-1 capitalize">{selectedRecord.leaveType.replace(/_/g, " ")}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Total days</dt>
                      <dd className="mt-1">{selectedRecord.totalDays}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Start date</dt>
                      <dd className="mt-1">{formatDate(selectedRecord.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">End date</dt>
                      <dd className="mt-1">{formatDate(selectedRecord.endDate)}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase text-muted-foreground">Employee reason</dt>
                      <dd className="mt-1 whitespace-pre-line text-muted-foreground">{selectedRecord.notes ?? "—"}</dd>
                    </div>
                    {selectedRecord.reviewerNotes ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase text-muted-foreground">Reviewer notes</dt>
                        <dd className="mt-1 whitespace-pre-line text-muted-foreground">{selectedRecord.reviewerNotes}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                    <Link href={`/employees/${selectedRecord.userId}`} className="text-primary hover:underline">
                      View employee profile
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load leave details.</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

