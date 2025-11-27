"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAttendanceReport } from "@/hooks/useAttendanceReport";
import { ReportBuilder, type ReportConfiguration } from "@/components/reports/ReportBuilder";
import { FileDown, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export default function ReportsPage() {
  const { records, loading, runReport } = useAttendanceReport();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{
    config: ReportConfiguration;
    generatedAt: Date;
    startDate: Date;
    endDate: Date;
  } | null>(null);

  // Filter records based on scope configuration
  const filteredRecords = useMemo(() => {
    if (!generatedReport) return records;

    const { scope } = generatedReport.config;

    // Company-wide: no filtering
    if (scope.level === "company") {
      return records;
    }

    // Department filtering
    if (scope.level === "department" && scope.departments && scope.departments.length > 0) {
      return records.filter(record =>
        record.department && scope.departments!.includes(record.department)
      );
    }

    // Individual employee filtering
    if (scope.level === "individual" && scope.employees && scope.employees.length > 0) {
      return records.filter(record =>
        scope.employees!.includes(record.userId)
      );
    }

    return records;
  }, [records, generatedReport]);

  const totalByStatus = useMemo(() => {
    return filteredRecords.reduce<Record<string, number>>((acc, record) => {
      const key = record.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredRecords]);

  const handleGenerate = async (config: ReportConfiguration) => {
    setIsGenerating(true);
    try {
      // Calculate date range
      let startDate: Date;
      let endDate: Date;

      if (config.dateRange.type === "quick" && config.dateRange.quick) {
        const now = new Date();
        switch (config.dateRange.quick) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            endDate = new Date();
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            break;
          case "quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date();
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date();
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
        }
      } else if (config.dateRange.start && config.dateRange.end) {
        startDate = config.dateRange.start;
        endDate = config.dateRange.end;
      } else {
        throw new Error("Invalid date range");
      }

      // Run report (fetch all data first)
      await runReport({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        userId: undefined,
        department: undefined,
      });

      setGeneratedReport({
        config,
        generatedAt: new Date(),
        startDate,
        endDate
      });
    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (exportFormat: "csv" | "json") => {
    if (filteredRecords.length === 0) return;

    const entries = filteredRecords.map(r => ({
      attendanceDate: r.attendanceDate ? format(r.attendanceDate, "yyyy-MM-dd") : "",
      userName: r.userName || r.userId || "",
      userEmail: r.userEmail || "",
      status: r.status || "",
      department: r.department || "",
      position: r.position || ""
    }));

    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    // CSV export
    let csv = "Date,Employee,Email,Status,Department,Position\n";
    entries.forEach((entry) => {
      const row = Object.values(entry)
        .map((value) => {
          if (typeof value !== "string") {
            return String(value ?? "");
          }
          if (value.includes(",") || value.includes("\"")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");

      csv += `${row}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Report Builder */}
          <ReportBuilder
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />

          {/* Report Metadata (if generated) */}
          {generatedReport && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-900">
                      Report generated at <span className="font-semibold">{format(generatedReport.generatedAt, "PPpp")}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-900">
                      {format(generatedReport.startDate, "MMM d, yyyy")} — {format(generatedReport.endDate, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Statistics */}
          {filteredRecords.length > 0 && (
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
          )}

          {/* Report Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Report Results</CardTitle>
                  <CardDescription>{filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"} returned.</CardDescription>
                </div>
                {filteredRecords.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    disabled={loading}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
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
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                          {records.length === 0
                            ? "Configure and generate a report to see attendance records."
                            : "No records match the selected scope filters."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
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

