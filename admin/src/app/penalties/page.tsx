"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { usePenalties } from "@/hooks/usePenalties";
import { callWaivePenalty } from "@/lib/firebase/functions";
import type { PenaltyStatus } from "@/types";

const statusFilters: Array<{ value: PenaltyStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "waived", label: "Waived" },
  { value: "disputed", label: "Disputed" },
  { value: "paid", label: "Paid" },
];

const statusStyles: Record<string, string> = {
  active: "bg-destructive/10 text-destructive",
  waived: "bg-emerald-100 text-emerald-600",
  disputed: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value ?? 0);

const formatDate = (value: Date | null) => (value ? value.toLocaleDateString() : "Unknown");
const formatDateTime = (value: Date | null) => (value ? value.toLocaleString() : "—");

export default function PenaltiesPage() {
  const { records, loading, error, search, setSearch, filters, setStatusFilter, setDateFilter, refresh } =
    usePenalties();
  const [waiveId, setWaiveId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiveSubmitting, setWaiveSubmitting] = useState(false);
  const [waiveError, setWaiveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeRecord = useMemo(() => records.find((record) => record.id === waiveId) ?? null, [records, waiveId]);

  const statusLabel = useMemo(
    () => statusFilters.find((filter) => filter.value === filters.status)?.label ?? "All",
    [filters.status]
  );

  async function handleWaiveSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!waiveId || !waiveReason.trim()) {
      setWaiveError("Please provide a waiver reason.");
      return;
    }

    setWaiveSubmitting(true);
    setWaiveError(null);
    try {
      await callWaivePenalty({ penaltyId: waiveId, waivedReason: waiveReason.trim() });
      setSuccessMessage("Penalty waived successfully.");
      setWaiveId(null);
      setWaiveReason("");
      await refresh();
    } catch (err) {
      console.error("Failed to waive penalty", err);
      const message = err instanceof Error ? err.message : "Unable to waive penalty. Please try again.";
      setWaiveError(message);
    } finally {
      setWaiveSubmitting(false);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Penalties</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review violation penalties, track statuses, and waive penalties with proper justification.
              </p>
            </div>
            {successMessage ? (
              <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}
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
                  onChange={(event) => setStatusFilter(event.target.value as PenaltyStatus | "all")}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFilter(null, null);
                  }}
                  disabled={
                    !search && (!filters.status || filters.status === "all") && !filters.startDate && !filters.endDate
                  }
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
                    <TableHead>Incurred</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Violation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Waived</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Loading penalties...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No penalties found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.dateIncurred)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{record.userName ?? record.userId}</span>
                            <span className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{record.violationType.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              statusStyles[record.status] ?? "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(record.amount)}</TableCell>
                        <TableCell>
                          {record.waivedAt ? (
                            <div className="text-xs text-muted-foreground">
                              <p>{formatDateTime(record.waivedAt)}</p>
                              {record.waivedReason ? <p className="mt-1">Reason: {record.waivedReason}</p> : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 text-sm"
                            onClick={() => {
                              setWaiveId(record.id);
                              setWaiveReason(record.waivedReason ?? "");
                              setWaiveError(null);
                              setSuccessMessage(null);
                            }}
                            disabled={record.status === "waived"}
                          >
                            Waive
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Showing {records.length} penalt{records.length === 1 ? "y" : "ies"}. Status filter: {statusLabel}.
            </p>
          </section>

          <Dialog open={waiveId !== null && Boolean(activeRecord)} onOpenChange={(open) => (!open ? setWaiveId(null) : null)}>
            <DialogContent>
              <DialogHeader
                title="Waive Penalty"
                description="Provide a clear reason for waiving this penalty. The action will be logged."
              />
              {activeRecord ? (
                <form className="space-y-4" onSubmit={handleWaiveSubmit}>
                  <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                    <p className="font-medium">{activeRecord.userName ?? activeRecord.userId}</p>
                    <p className="text-xs text-muted-foreground">Violation: {activeRecord.violationType}</p>
                    <p className="text-xs text-muted-foreground">Amount: {formatCurrency(activeRecord.amount)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label requiredMarker htmlFor="waiveReason">
                      Waive reason
                    </Label>
                    <Textarea
                      id="waiveReason"
                      value={waiveReason}
                      onChange={(event) => setWaiveReason(event.target.value)}
                      placeholder="Explain why this penalty is being waived"
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This reason will be stored in the penalty record and the audit log for future reference.
                    </p>
                  </div>

                  {waiveError ? <p className="text-sm text-destructive">{waiveError}</p> : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setWaiveId(null)} disabled={waiveSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={waiveSubmitting}>
                      {waiveSubmitting ? "Saving..." : "Confirm Waive"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load penalty details.</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
