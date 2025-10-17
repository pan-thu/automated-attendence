"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const formatDateTime = (value: Date | null | undefined) => {
  if (!value) return "—";
  return `${value.toLocaleDateString()} ${value.toLocaleTimeString()}`;
};

export default function SettingsPage() {
  const { settings, loading, error } = useCompanySettings();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const summaryRows = useMemo(() => {
    if (!settings) return [];
    return [
      { label: "Company Name", value: settings.companyName ?? "—" },
      { label: "Timezone", value: settings.timezone ?? "—" },
      {
        label: "Workplace Center",
        value: settings.workplace_center
          ? `${settings.workplace_center.latitude.toFixed(6)}, ${settings.workplace_center.longitude.toFixed(6)}`
          : "—",
      },
      { label: "Workplace Radius (m)", value: settings.workplace_radius ?? "—" },
      { label: "Geofencing Enabled", value: settings.geoFencingEnabled ? "Yes" : "No" },
      { label: "Updated At", value: formatDateTime(settings.updatedAt) },
      { label: "Updated By", value: settings.updatedBy ?? "—" },
    ];
  }, [settings]);

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">Company Settings</h1>
              <p className="text-sm text-muted-foreground">
                View the active configuration for attendance, policies, geofencing, and more.
              </p>
            </div>
            <Button asChild>
              <Link href="/settings/edit">Edit Settings</Link>
            </Button>
          </header>

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Summary</h2>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading settings...</p>
            ) : settings ? (
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No settings found.</p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Working Days & Holidays</h2>
                <p className="text-xs text-muted-foreground">Review configured working days, leave policies, and holidays.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpandedSection((prev) => (prev === "calendar" ? null : "calendar"))}
              >
                {expandedSection === "calendar" ? "Collapse" : "Expand"}
              </Button>
            </header>

            {expandedSection === "calendar" && settings ? (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Working Days</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.workingDays
                      ? Object.entries(settings.workingDays).map(([day, value]) => (
                          <li key={day} className="flex justify-between">
                            <span className="capitalize">{day}</span>
                            <span>{value ? "Working" : "Off"}</span>
                          </li>
                        ))
                      : "Not configured"}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Holidays</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.holidays && settings.holidays.length > 0
                      ? settings.holidays.map((holiday) => <li key={holiday}>{holiday}</li>)
                      : "No holidays configured"}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Leave Policy</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.leavePolicy
                      ? Object.entries(settings.leavePolicy).map(([type, value]) => (
                          <li key={type} className="flex justify-between capitalize">
                            <span>{type.replace(/_/g, " ")}</span>
                            <span>{value} days</span>
                          </li>
                        ))
                      : "No leave policy configured"}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Attendance Windows</h2>
                <p className="text-xs text-muted-foreground">Active time windows and grace periods for attendance checks.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpandedSection((prev) => (prev === "attendance" ? null : "attendance"))}
              >
                {expandedSection === "attendance" ? "Collapse" : "Expand"}
              </Button>
            </header>

            {expandedSection === "attendance" && settings ? (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Time Windows</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {settings.timeWindows
                      ? Object.entries(settings.timeWindows).map(([key, window]) => (
                          <li key={key} className="rounded-md border p-2">
                            <p className="font-medium capitalize">{window.label || key.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">
                              {window.start} - {window.end}
                            </p>
                          </li>
                        ))
                      : "No windows configured"}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Grace Periods</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.gracePeriods
                      ? Object.entries(settings.gracePeriods).map(([key, value]) => (
                          <li key={key} className="flex justify-between capitalize">
                            <span>{key.replace(/_/g, " ")}</span>
                            <span>{value} minutes</span>
                          </li>
                        ))
                      : "No grace periods configured"}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Penalty Rules</h2>
                <p className="text-xs text-muted-foreground">Current penalty thresholds and amounts.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpandedSection((prev) => (prev === "penalties" ? null : "penalties"))}
              >
                {expandedSection === "penalties" ? "Collapse" : "Expand"}
              </Button>
            </header>

            {expandedSection === "penalties" && settings?.penaltyRules ? (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Violation Thresholds</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.penaltyRules.violationThresholds && Object.keys(settings.penaltyRules.violationThresholds).length > 0
                      ? Object.entries(settings.penaltyRules.violationThresholds).map(([key, value]) => (
                          <li key={key} className="flex justify-between capitalize">
                            <span>{key.replace(/_/g, " ")}</span>
                            <span>{value} violations</span>
                          </li>
                        ))
                      : "No thresholds configured"}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Penalty Amounts</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {settings.penaltyRules.amounts && Object.keys(settings.penaltyRules.amounts).length > 0
                      ? Object.entries(settings.penaltyRules.amounts).map(([key, value]) => (
                          <li key={key} className="flex justify-between capitalize">
                            <span>{key.replace(/_/g, " ")}</span>
                            <span>${value.toFixed(2)}</span>
                          </li>
                        ))
                      : "No amounts configured"}
                  </ul>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

