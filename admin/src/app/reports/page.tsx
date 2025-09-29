"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAttendanceReport } from "@/hooks/useAttendanceReport";

const defaultFilters = {
  startDate: "",
  endDate: "",
  userId: "",
  department: "",
};

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export default function ReportsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const { records, loading, error, runReport } = useAttendanceReport();
  const [notes, setNotes] = useState("Attendance report generated via dashboard.");

  const totalByStatus = useMemo(() => {
    return records.reduce<Record<string, number>>((acc, record) => {
      const key = record.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [records]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filters.startDate || !filters.endDate) {
      setNotes("Please select a start and end date before running the report.");
      return;
    }

    await runReport({
      startDate: filters.startDate,
      endDate: filters.endDate,
      userId: filters.userId || undefined,
      department: filters.department || undefined,
    });
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Attendance Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generate attendance summaries for custom date ranges, departments, or employees.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Report Filters</CardTitle>
              <CardDescription>Select the range and criteria for the attendance report.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userId">Employee ID</Label>
                  <Input
                    id="userId"
                    value={filters.userId}
                    onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={filters.department}
                    onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add context for this report"
                  />
                </div>

                {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

                <div className="md:col-span-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFilters(defaultFilters);
                      setNotes("Attendance report generated via dashboard.");
                    }}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Generating..." : "Run Report"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(totalByStatus).map(([status, total]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize">{status.replace(/_/g, " ")}</CardTitle>
                  <CardDescription>Occurrences in current report</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{total}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Report Results</CardTitle>
              <CardDescription>{records.length} record{records.length === 1 ? "" : "s"} returned.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                          Run a report to see attendance records.
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.attendanceDate)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="font-medium">{record.userName ?? record.userId}</span>
                              <span className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {record.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.department ?? "—"}</TableCell>
                          <TableCell>{record.position ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

