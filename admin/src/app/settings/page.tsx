"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/config";
import { Loader2, Database, Trash2 } from "lucide-react";

const formatDateTime = (value: Date | null | undefined) => {
  if (!value) return "—";
  return `${value.toLocaleDateString()} ${value.toLocaleTimeString()}`;
};

export default function SettingsPage() {
  const { settings, loading, error } = useCompanySettings();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [seedingData, setSeedingData] = useState(false);
  const [cleaningData, setCleaningData] = useState(false);
  const [testDataMessage, setTestDataMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSeedTestData = async () => {
    try {
      setSeedingData(true);
      setTestDataMessage(null);
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const seedTestData = httpsCallable<{ cleanFirst: boolean }, { success: boolean; users: Record<string, string> }>(
        functions,
        "seedTestData"
      );
      const result = await seedTestData({ cleanFirst: true });
      setTestDataMessage({
        type: "success",
        text: `Test data seeded successfully! Created users: ${Object.keys(result.data.users).join(", ")}`,
      });
    } catch (err) {
      console.error("Failed to seed test data", err);
      setTestDataMessage({
        type: "error",
        text: `Failed to seed test data: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setSeedingData(false);
    }
  };

  const handleCleanupTestData = async () => {
    try {
      setCleaningData(true);
      setTestDataMessage(null);
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const cleanupTestData = httpsCallable<object, { success: boolean; deletedCount: number }>(
        functions,
        "cleanupTestData"
      );
      const result = await cleanupTestData({});
      setTestDataMessage({
        type: "success",
        text: `Test data cleaned up! Deleted ${result.data.deletedCount} documents.`,
      });
    } catch (err) {
      console.error("Failed to cleanup test data", err);
      setTestDataMessage({
        type: "error",
        text: `Failed to cleanup test data: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setCleaningData(false);
    }
  };

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
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Summary</h2>
              <Button asChild size="sm">
                <Link href="/settings/edit">Edit Settings</Link>
              </Button>
            </div>
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

          {/* Test Data Section - Temporary for testing */}
          <section className="rounded-lg border border-dashed border-orange-300 bg-orange-50 p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-orange-800">Test Data Management</h2>
                <p className="text-xs text-orange-600">
                  Seed or cleanup test data for testing purposes. Test data IDs are prefixed with &quot;TEST_&quot;.
                </p>
              </div>
            </header>

            {testDataMessage && (
              <div
                className={`mt-4 rounded-md px-4 py-3 text-sm ${
                  testDataMessage.type === "success"
                    ? "border border-green-300 bg-green-50 text-green-800"
                    : "border border-red-300 bg-red-50 text-red-800"
                }`}
              >
                {testDataMessage.text}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                onClick={handleSeedTestData}
                disabled={seedingData || cleaningData}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {seedingData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Test Data
                  </>
                )}
              </Button>
              <Button
                onClick={handleCleanupTestData}
                disabled={seedingData || cleaningData}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {cleaningData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cleanup Test Data
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 text-xs text-orange-600">
              <p className="font-medium">Test data includes:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>5 test users (1 admin, 3 employees, 1 inactive)</li>
                <li>Attendance records across 5 days</li>
                <li>6 leave requests (pending, approved, rejected)</li>
                <li>6 penalties (active, waived, paid)</li>
                <li>Notifications and audit logs</li>
              </ul>
            </div>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

