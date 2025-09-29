"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuditLogs } from "@/hooks/useAuditLogs";

const resourceOptions = [
  { value: "all", label: "All resources" },
  { value: "USERS", label: "Users" },
  { value: "ATTENDANCE_RECORDS", label: "Attendance" },
  { value: "LEAVE_REQUESTS", label: "Leaves" },
  { value: "PENALTIES", label: "Penalties" },
  { value: "NOTIFICATIONS", label: "Notifications" },
  { value: "COMPANY_SETTINGS", label: "Settings" },
  { value: "AUDIT_LOGS", label: "Audit Logs" },
];

const statusBadge: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-600",
  failure: "bg-destructive/10 text-destructive",
  error: "bg-destructive/10 text-destructive",
};

const formatDateTime = (value: Date | null) => (value ? value.toLocaleString() : "—");

export default function AuditLogsPage() {
  const {
    records,
    loading,
    error,
    search,
    setSearch,
    filters,
    setActionFilter,
    setResourceFilter,
    setDateFilter,
    setPerformedByFilter,
    refresh,
  } = useAuditLogs();
  const [detailId, setDetailId] = useState<string | null>(null);

  const selectedLog = useMemo(() => records.find((record) => record.id === detailId) ?? null, [records, detailId]);

  const resourceLabel = useMemo(
    () => resourceOptions.find((option) => option.value === filters.resource)?.label ?? "All resources",
    [filters.resource]
  );

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Audit Logs</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Inspect sensitive actions performed by admins. All entries are immutable and fetched directly from
                Firestore.
              </p>
            </div>
          </header>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by action, resource, or user"
                  className="w-full sm:w-72"
                />
                <Input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    setDateFilter(event.target.value ? new Date(event.target.value) : null, filters.endDate ?? null)
                  }
                />
                <Input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    setDateFilter(filters.startDate ?? null, event.target.value ? new Date(event.target.value) : null)
                  }
                />
                <Select value={filters.resource ?? "all"} onChange={(event) => setResourceFilter(event.target.value)} className="w-44">
                  {resourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Filter by action"
                  value={filters.action && filters.action !== "all" ? String(filters.action) : ""}
                  onChange={(event) => setActionFilter(event.target.value ? event.target.value : "all")}
                  className="w-40"
                />
                <Input
                  placeholder="Performed by UID"
                  value={filters.performedBy ?? ""}
                  onChange={(event) => setPerformedByFilter(event.target.value || undefined)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setResourceFilter("all");
                    setActionFilter("all");
                    setPerformedByFilter(undefined);
                    setDateFilter(null, null);
                  }}
                  disabled={
                    !search &&
                    (!filters.resource || filters.resource === "all") &&
                    (!filters.action || filters.action === "all") &&
                    !filters.performedBy &&
                    !filters.startDate &&
                    !filters.endDate
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
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Loading audit logs...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No audit entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{log.performedBy}</span>
                            <span className="text-xs text-muted-foreground">{log.performedByEmail ?? "No email"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              statusBadge[log.status] ?? "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="link" className="p-0 text-sm" onClick={() => setDetailId(log.id)}>
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
              Showing {records.length} entr{records.length === 1 ? "y" : "ies"}. Resource filter: {resourceLabel}. Paginated loading is not yet implemented—filters apply client-side to the streamed dataset.
            </p>
          </section>

          <Dialog open={detailId !== null && Boolean(selectedLog)} onOpenChange={(open) => (!open ? setDetailId(null) : null)}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader title="Audit Log Details" description="Full payload for compliance review." />
              {selectedLog ? (
                <div className="space-y-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Action</h2>
                      <p className="mt-1 font-medium">{selectedLog.action}</p>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Resource</h2>
                      <p className="mt-1 font-medium">{selectedLog.resource}</p>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Performed by</h2>
                      <p className="mt-1 font-medium">{selectedLog.performedBy}</p>
                      <p className="text-xs text-muted-foreground">{selectedLog.performedByEmail ?? "No email"}</p>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Timestamp</h2>
                      <p className="mt-1">{formatDateTime(selectedLog.timestamp)}</p>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Resource ID</h2>
                      <p className="mt-1 text-muted-foreground">{selectedLog.resourceId || "—"}</p>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase text-muted-foreground">Status</h2>
                      <p className="mt-1">{selectedLog.status}</p>
                    </div>
                  </div>

                  {selectedLog.errorMessage ? (
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase text-muted-foreground">Error message</h2>
                      <div className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <pre className="whitespace-pre-wrap">{selectedLog.errorMessage}</pre>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase text-muted-foreground">Old values</h2>
                      <div className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <pre className="whitespace-pre-wrap">
                          {selectedLog.oldValues ? JSON.stringify(selectedLog.oldValues, null, 2) : "—"}
                        </pre>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase text-muted-foreground">New values</h2>
                      <div className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <pre className="whitespace-pre-wrap">
                          {selectedLog.newValues ? JSON.stringify(selectedLog.newValues, null, 2) : "—"}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {selectedLog.metadata ? (
                    <div className="space-y-2">
                      <h2 className="text-xs uppercase text-muted-foreground">Metadata</h2>
                      <div className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load audit log details.</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
