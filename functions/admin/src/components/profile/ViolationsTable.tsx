"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertCircle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Violation {
  id: string;
  date: Date;
  type: "late" | "absent" | "half_day" | "early_leave";
  checkType?: "check1" | "check2" | "check3";
  timeRecorded?: string;
  expectedTime?: string;
  minutesLate?: number;
  penaltyApplied: boolean;
  penaltyAmount?: number;
  notes?: string;
}

interface ViolationsTableProps {
  violations?: Violation[];
  loading?: boolean;
  onExport?: () => void;
  showPagination?: boolean;
}

const violationConfig = {
  late: {
    label: "Late Arrival",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
    severity: "low"
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    severity: "high"
  },
  half_day: {
    label: "Half Day",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle,
    severity: "medium"
  },
  early_leave: {
    label: "Early Leave",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    severity: "low"
  }
};

const checkTypeLabels = {
  check1: "Morning",
  check2: "Lunch",
  check3: "Evening"
};

export function ViolationsTable({
  violations = [],
  loading = false,
  onExport,
  showPagination = true
}: ViolationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const itemsPerPage = 10;

  // Mock data for demonstration
  const mockViolations: Violation[] = violations.length > 0 ? violations : [
    {
      id: "1",
      date: new Date(2024, 10, 20),
      type: "late",
      checkType: "check1",
      timeRecorded: "09:25 AM",
      expectedTime: "09:15 AM",
      minutesLate: 10,
      penaltyApplied: false
    },
    {
      id: "2",
      date: new Date(2024, 10, 18),
      type: "absent",
      penaltyApplied: true,
      penaltyAmount: 20
    },
    {
      id: "3",
      date: new Date(2024, 10, 15),
      type: "early_leave",
      checkType: "check3",
      timeRecorded: "04:30 PM",
      expectedTime: "04:45 PM",
      minutesLate: 15,
      penaltyApplied: false
    },
    {
      id: "4",
      date: new Date(2024, 10, 12),
      type: "late",
      checkType: "check2",
      timeRecorded: "01:20 PM",
      expectedTime: "01:00 PM",
      minutesLate: 20,
      penaltyApplied: true,
      penaltyAmount: 10
    },
    {
      id: "5",
      date: new Date(2024, 10, 10),
      type: "half_day",
      penaltyApplied: true,
      penaltyAmount: 15,
      notes: "Only completed morning check"
    },
    {
      id: "6",
      date: new Date(2024, 10, 8),
      type: "late",
      checkType: "check1",
      timeRecorded: "09:30 AM",
      expectedTime: "09:15 AM",
      minutesLate: 15,
      penaltyApplied: false
    },
    {
      id: "7",
      date: new Date(2024, 10, 5),
      type: "absent",
      penaltyApplied: true,
      penaltyAmount: 20,
      notes: "No prior notice"
    },
    {
      id: "8",
      date: new Date(2024, 10, 3),
      type: "late",
      checkType: "check1",
      timeRecorded: "09:45 AM",
      expectedTime: "09:15 AM",
      minutesLate: 30,
      penaltyApplied: true,
      penaltyAmount: 10
    }
  ];

  // Filter violations
  const filteredViolations = filterType === "all"
    ? mockViolations
    : mockViolations.filter(v => v.type === filterType);

  // Calculate pagination
  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViolations = filteredViolations.slice(startIndex, endIndex);

  // Calculate statistics
  const violationCounts = mockViolations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPenalties = mockViolations
    .filter(v => v.penaltyApplied)
    .reduce((sum, v) => sum + (v.penaltyAmount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Violation History
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2 text-sm border rounded-md"
            >
              <option value="all">All Types</option>
              <option value="late">Late Arrivals</option>
              <option value="absent">Absences</option>
              <option value="half_day">Half Days</option>
              <option value="early_leave">Early Leaves</option>
            </select>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredViolations.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No violations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filterType !== "all" ? "Try changing the filter" : "Excellent attendance record!"}
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(violationConfig).map(([key, config]) => {
                const count = violationCounts[key] || 0;
                const Icon = config.icon;

                return (
                  <div
                    key={key}
                    className="text-center p-3 rounded-lg bg-muted/50"
                  >
                    <Icon className={cn(
                      "h-4 w-4 mx-auto mb-1",
                      count > 0 ? config.color.split(" ")[1] : "text-muted-foreground"
                    )} />
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Violations Table */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Penalty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentViolations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No violations to display
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentViolations.map((violation) => {
                      const config = violationConfig[violation.type];
                      const Icon = config.icon;

                      return (
                        <TableRow key={violation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {format(violation.date, "MMM dd, yyyy")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("gap-1", config.color)}
                            >
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {violation.checkType && (
                                <p className="text-sm">
                                  {checkTypeLabels[violation.checkType]} check
                                </p>
                              )}
                              {violation.timeRecorded && (
                                <p className="text-xs text-muted-foreground">
                                  Recorded: {violation.timeRecorded}
                                  {violation.expectedTime && ` (Expected: ${violation.expectedTime})`}
                                </p>
                              )}
                              {violation.notes && (
                                <p className="text-xs text-muted-foreground italic">
                                  {violation.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {violation.minutesLate ? (
                              <span className="text-sm font-medium">
                                {violation.minutesLate} min
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {violation.penaltyApplied ? (
                              <Badge variant="secondary">
                                ${violation.penaltyAmount}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {showPagination && totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredViolations.length)} of {filteredViolations.length} violations
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Total Penalties */}
            {totalPenalties > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Penalties</span>
                  <span className="text-lg font-bold">${totalPenalties}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}