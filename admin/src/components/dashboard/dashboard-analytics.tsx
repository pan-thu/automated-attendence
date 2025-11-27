"use client";

import { RefreshCw } from "lucide-react";

import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";

const badgeBaseClass =
  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm bg-background";

const StatBadge = ({ label, value }: { label: string; value: number }) => {
  return (
    <div className={`${badgeBaseClass} flex-1`}>
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
};

const ViolationRow = ({
  label,
  badge,
  timestamp,
}: {
  label: string;
  badge?: string | null;
  timestamp: Date | null;
}) => {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm shadow-xs">
      <div>
        <p className="font-medium capitalize">{label.replaceAll("_", " ")}</p>
        <p className="text-xs text-muted-foreground">
          {timestamp ? format(timestamp, "dd MMM yyyy HH:mm") : "Unknown timestamp"}
        </p>
      </div>
      {badge ? (
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
          {badge}
        </span>
      ) : null}
    </div>
  );
};

export function DashboardAnalytics() {
  const { data, loading, error, refresh } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Today’s admin overview.</p>
        </div>
        <div className="flex items-center gap-3">
          {loading ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void refresh();
            }}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Today’s Attendance</h2>
            <p className="text-xs text-muted-foreground">Updates automatically as records sync.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <StatBadge label="Present" value={data.attendance.present} />
              <StatBadge label="Absent" value={data.attendance.absent} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <StatBadge label="On Leave" value={data.attendance.onLeave} />
              <StatBadge label="Half Day" value={data.attendance.halfDay} />
            </div>
            <div className={`${badgeBaseClass} justify-between border-dashed`}>
              <span className="text-xs uppercase text-muted-foreground">Total Records</span>
              <span className="text-sm font-medium">{data.attendance.total}</span>
            </div>
          </div>
        </article>

        <article className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Pending Leave Requests</h2>
            <p className="text-xs text-muted-foreground">
              Requests waiting for a decision. Review them on the Leaves page.
            </p>
          </div>
          <div className="flex items-baseline justify-between rounded-md border bg-muted/30 px-4 py-6">
            <span className="text-4xl font-semibold">{data.pendingLeaves}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Pending</span>
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm xl:col-span-1 xl:row-span-2">
          <div>
            <h2 className="text-lg font-semibold">Recent Violations</h2>
            <p className="text-xs text-muted-foreground">
              Latest compliance incidents, including claimed penalties.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {data.recentViolations.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                No violations logged yet.
              </div>
            ) : (
              data.recentViolations.map((violation) => (
                <ViolationRow
                  key={violation.id}
                  label={violation.violationType}
                  badge={
                    violation.penaltyTriggered
                      ? violation.monthlyCount
                        ? `${violation.monthlyCount} violations`
                        : "Penalty issued"
                      : violation.monthlyCount
                        ? `${violation.monthlyCount} flagged`
                        : null
                  }
                  timestamp={violation.createdAt}
                />
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

