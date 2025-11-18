"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAttendanceRecords } from "@/hooks/useAttendanceRecords";
import { useManualAttendance } from "@/hooks/useManualAttendance";
import { useEmployees } from "@/hooks/useEmployees";

// Import new components
import { FilterBar } from "@/components/attendance/FilterBar";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import type { AttendanceStatus } from "@/types";

export default function AttendancePage() {
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  const [manualForm, setManualForm] = useState({
    userId: "",
    attendanceDate: "",
    checkIn: "",
    checkOut: "",
    breakOut: "",
    breakIn: "",
    status: "present" as AttendanceStatus | string,
    reason: "",
    notes: ""
  });

  const [filters, setFilters] = useState({
    quickFilter: "today",
    dateRange: { start: new Date(), end: new Date() },
    status: "all",
    employee: "all",
    source: "all",
    search: ""
  });

  const {
    records,
    loading,
    error,
    refresh
  } = useAttendanceRecords();

  const { employees } = useEmployees();

  const { submitManualAttendance, loading: manualSubmitting, error: manualError, setError: setManualError } =
    useManualAttendance();

  // Transform records to match new interface
  const transformedRecords = useMemo(() => {
    if (!records) return [];

    return records
      .filter((record) => {
        // Apply filters
        if (filters.search && !record.userName?.toLowerCase().includes(filters.search.toLowerCase()) &&
            !record.userEmail?.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }

        // Filter by check status instead of attendance status
        if (filters.status !== "all") {
          const checkStatus = record.checks?.[0]?.status;
          const hasCheckIn = !!record.checks?.[0]?.timestamp;

          if (filters.status === "on_time" && checkStatus !== "on_time") {
            return false;
          }
          if (filters.status === "late" && checkStatus !== "late") {
            return false;
          }
          if (filters.status === "missed" && hasCheckIn) {
            return false;
          }
        }

        if (filters.employee && filters.employee !== "all" && record.userId !== filters.employee) {
          return false;
        }

        if (filters.source !== "all") {
          const isManual = record.isManualEntry;
          if (filters.source === "manual" && !isManual) return false;
          if (filters.source === "app" && isManual) return false;
        }

        return true;
      })
      .map((record) => ({
        id: record.id,
        date: record.attendanceDate || new Date(),
        employee: {
          uid: record.userId,
          name: record.userName || "Unknown",
          email: record.userEmail || "",
          employeeId: record.userId.slice(0, 8).toUpperCase(),
          department: "Engineering", // Mock data
          avatar: undefined
        },
        checks: {
          checkIn: {
            time: record.checks?.[0]?.timestamp || null,
            status: record.checks?.[0]?.status as "on_time" | "late" | null || null
          },
          break: undefined, // Not in current data model
          checkOut: {
            time: record.checks?.[2]?.timestamp || null,
            status: record.checks?.[2]?.status as "on_time" | "early" | null || null
          }
        },
        status: record.status as "present" | "late" | "half_day" | "absent" | "on_leave",
        workDuration: undefined,
        source: record.isManualEntry ? "manual" as const : "app" as const,
        notes: record.notes || undefined,
        modifiedBy: undefined,
        modifiedAt: undefined
      }));
  }, [records, filters]);

  // Calculate summary - count check statuses
  const summary = useMemo(() => {
    const stats = {
      onTime: 0,
      late: 0,
      missed: 0
    };

    transformedRecords.forEach((record) => {
      // Count based on check-in status
      if (record.checks.checkIn.status === "on_time") {
        stats.onTime++;
      } else if (record.checks.checkIn.status === "late") {
        stats.late++;
      } else if (!record.checks.checkIn.time) {
        stats.missed++;
      }
    });

    return stats;
  }, [transformedRecords]);

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualForm.userId || !manualForm.attendanceDate || !manualForm.reason) {
      setManualError("Please complete all required fields.");
      return;
    }

    try {
      await submitManualAttendance({
        userId: manualForm.userId,
        attendanceDate: manualForm.attendanceDate,
        status: manualForm.status,
        reason: manualForm.reason,
        notes: manualForm.notes || undefined
      });
      setManualDialogOpen(false);
      setManualForm({
        userId: "",
        attendanceDate: "",
        checkIn: "",
        checkOut: "",
        breakOut: "",
        breakIn: "",
        status: "present",
        reason: "",
        notes: ""
      });
      await refresh();
    } catch (err) {
      console.error("Manual attendance submission failed", err);
    }
  };

  const handleExport = () => {
    // Export logic
    console.log("Exporting attendance records");
  };

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (record: any) => {
    setManualForm({
      userId: record.employee.uid,
      attendanceDate: record.date.toISOString().split('T')[0],
      checkIn: record.checks.checkIn.time ?
               new Date(record.checks.checkIn.time).toTimeString().slice(0, 5) : "",
      checkOut: record.checks.checkOut.time ?
                new Date(record.checks.checkOut.time).toTimeString().slice(0, 5) : "",
      breakOut: "",
      breakIn: "",
      status: record.status,
      reason: "",
      notes: record.notes || ""
    });
    setManualDialogOpen(true);
  };

  const handleSelectRecord = (id: string) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedRecords(selected ? transformedRecords.map((r) => r.id) : []);
  };

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
            onRefresh={refresh}
            isLoading={loading}
            employees={employees.map((e) => ({ id: e.id, name: e.fullName }))}
            summary={summary}
            onManualEntry={() => setManualDialogOpen(true)}
          />

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Attendance Table */}
          <AttendanceTable
            records={transformedRecords}
            loading={loading}
            selectedRecords={selectedRecords}
            onSelectRecord={handleSelectRecord}
            onSelectAll={handleSelectAll}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onExportRecord={(record) => console.log("Export", record)}
          />

          {/* Pagination */}
          {transformedRecords.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {transformedRecords.length} records
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Manual Entry Dialog */}
          <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Manual Attendance Entry</DialogTitle>
                <DialogDescription>
                  Override or create attendance records with justification
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleManualSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label requiredMarker htmlFor="userId">
                      Employee
                    </Label>
                    <Select
                      value={manualForm.userId}
                      onValueChange={(value) => setManualForm((prev) => ({ ...prev, userId: value }))}
                      required
                    >
                      <SelectTrigger id="userId">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label requiredMarker htmlFor="attendanceDate">
                      Date
                    </Label>
                    <Input
                      id="attendanceDate"
                      type="date"
                      value={manualForm.attendanceDate}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, attendanceDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkIn">Check-in Time</Label>
                    <Input
                      id="checkIn"
                      type="time"
                      value={manualForm.checkIn}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, checkIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check-out Time</Label>
                    <Input
                      id="checkOut"
                      type="time"
                      value={manualForm.checkOut}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, checkOut: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={manualForm.status}
                      onValueChange={(value) => setManualForm((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label requiredMarker htmlFor="reason">
                      Reason
                    </Label>
                    <Textarea
                      id="reason"
                      value={manualForm.reason}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Provide justification for manual entry"
                      required
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={manualForm.notes}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes"
                      rows={2}
                    />
                  </div>
                </div>

                {manualError && (
                  <p className="text-sm text-destructive">{manualError}</p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setManualDialogOpen(false);
                      setManualError(null);
                    }}
                    disabled={manualSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={manualSubmitting}>
                    {manualSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attendance Details</DialogTitle>
              </DialogHeader>
              {selectedRecord && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Employee</p>
                    <p className="text-sm text-muted-foreground">{selectedRecord.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRecord.date.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {selectedRecord.status.replace("_", " ")}
                    </p>
                  </div>
                  {selectedRecord.notes && (
                    <div>
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-muted-foreground">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}