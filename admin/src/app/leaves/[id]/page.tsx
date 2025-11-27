"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useLeaveDetail } from "@/hooks/useLeaveDetail";
import { useLeaveApproval } from "@/hooks/useLeaveApproval";

const formatDate = (value: Date | null) => (value ? value.toLocaleDateString() : "Unknown");

export default function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { record, loading, error, refresh } = useLeaveDetail(id);
  const { submitLeaveDecision, loading: deciding, error: decisionError, setError } = useLeaveApproval();
  const [decisionNotes, setDecisionNotes] = useState<string>("");

  const disableActions = useMemo(() => record?.status !== "pending", [record?.status]);

  useEffect(() => {
    setDecisionNotes("");
    setError(null);
  }, [record?.status, setError]);

  async function handleDecision(action: "approve" | "reject") {
    if (!record) {
      return;
    }

    try {
      await submitLeaveDecision({ requestId: record.id, action, notes: decisionNotes || undefined });
      await refresh();
    } catch (err) {
      console.error("Failed to handle leave decision", err);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link className="text-xs text-muted-foreground hover:text-foreground" href="/leaves">
                ← Back to leaves
              </Link>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDecision("approve")}
                disabled={disableActions || deciding}
              >
                {deciding ? "Processing..." : "Approve"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDecision("reject")}
                disabled={disableActions || deciding}
              >
                {deciding ? "Processing..." : "Reject"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {record ? (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <section className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{record.userName ?? record.userId}</h2>
                    <p className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      record.status === "approved"
                        ? "bg-emerald-100 text-emerald-600"
                        : record.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Leave type</Label>
                    <p className="mt-1 text-sm capitalize">{record.leaveType.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Total days</Label>
                    <p className="mt-1 text-sm">{record.totalDays}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Start date</Label>
                    <p className="mt-1 text-sm">{formatDate(record.startDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">End date</Label>
                    <p className="mt-1 text-sm">{formatDate(record.endDate)}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Employee reason</Label>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{record.notes ?? "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Reviewer notes</Label>
                    <Input
                      value={decisionNotes}
                      onChange={(event) => setDecisionNotes(event.target.value)}
                      placeholder="Optional notes to include with your decision"
                      disabled={disableActions || deciding}
                    />
                    {record.reviewerNotes ? (
                      <p className="mt-2 text-xs text-muted-foreground">Previous notes: {record.reviewerNotes}</p>
                    ) : null}
                  </div>
                </div>

                {decisionError ? (
                  <p className="mt-3 text-sm text-destructive">{decisionError}</p>
                ) : null}
              </section>

              <section className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Summary</h3>
                <Table className="mt-4 text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Applied on</TableCell>
                      <TableCell>{formatDate(record.appliedAt)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>{record.status}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>{record.userId}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-4 text-xs text-muted-foreground">
                  <Link href={`/employees/${record.userId}`} className="text-primary hover:underline">
                    View employee profile
                  </Link>
                </div>
              </section>
            </div>
          ) : loading ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading leave request...</div>
          ) : (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Leave request not found.</div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

