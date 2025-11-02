"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { MetricCard } from "./MetricCard";
import { AttendanceChart } from "./AttendanceChart";
import { LeaveRequests } from "./LeaveRequests";
import { AttendanceTable } from "./AttendanceTable";
import { AuditLogList } from "./AuditLogList";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useLeaves } from "@/hooks/useLeaves";
import { useLeaveApproval } from "@/hooks/useLeaveApproval";
import { useAttendanceRecords } from "@/hooks/useAttendanceRecords";
import { useAttendanceTrends } from "@/hooks/useAttendanceTrends";
import { useAuditLogs } from "@/hooks/useAuditLogs";

export function EnhancedDashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard
  } = useDashboardSummary();

  const {
    records: leaves,
    loading: leavesLoading
  } = useLeaves();

  const {
    submitLeaveDecision
  } = useLeaveApproval();

  const {
    records: attendanceRecords,
    loading: attendanceLoading,
    refresh: refreshAttendance
  } = useAttendanceRecords();

  const {
    data: trendsData,
    loading: trendsLoading,
    error: trendsError,
    refresh: refreshTrends
  } = useAttendanceTrends({
    year: selectedYear,
    month: selectedMonth
  });

  const {
    records: auditLogs,
    loading: auditLogsLoading,
    refresh: refreshAuditLogs
  } = useAuditLogs({ maxRecords: 10 });

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await Promise.all([
      refreshDashboard(),
      refreshAttendance(),
      refreshTrends(),
      refreshAuditLogs()
    ]);
  };

  // Calculate attendance rate
  const attendanceRate = dashboardData.attendance.total > 0
    ? Math.round((dashboardData.attendance.present / dashboardData.attendance.total) * 100)
    : 0;

  // Note: Trend calculations removed - would require additional historical data queries
  // which could slow down the dashboard. Consider implementing with cached analytics data.

  // Transform leave data for the LeaveRequests component
  const leaveRequestsData = leaves.map(leave => ({
    id: leave.id,
    employee: {
      id: leave.userId,
      name: leave.userName || "Unknown Employee",
      email: leave.userEmail || "",
      department: "Not Specified",
      avatar: undefined
    },
    type: ((leave.type || leave.leaveType || 'other').toLowerCase().replace(/_/g, '')) as any,
    startDate: leave.startDate || new Date(),
    endDate: leave.endDate || new Date(),
    reason: leave.reason || leave.notes || "",
    status: leave.status,
    requestedAt: leave.appliedAt || new Date(),
    attachments: 0
  }));

  // Transform attendance records for the AttendanceTable component
  const checkInRecords = attendanceRecords.flatMap(record => {
    const records: any[] = [];

    if (record.checks && record.checks.length > 0) {
      record.checks.forEach((check, index) => {
        if (check.timestamp) {
          const checkNum = index + 1;
          records.push({
            id: `${record.id}-check${checkNum}`,
            employee: {
              id: record.userId,
              name: record.userName || "Unknown",
              email: record.userEmail || "",
              department: "Not Specified",
              avatar: undefined
            },
            checkType: `check${checkNum}` as "check1" | "check2" | "check3",
            status: (check.status || "missed") as any,
            timestamp: check.timestamp,
            location: undefined,
            isMocked: false
          });
        }
      });
    }

    return records;
  });

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      {/* Error Alert */}
      {dashboardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{dashboardError}</p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Employees"
          value={dashboardData.attendance.total}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          changeLabel="Active workforce"
        />

        <MetricCard
          title="Present Today"
          value={dashboardData.attendance.present}
          icon={<UserCheck className="h-5 w-5" />}
          color="green"
          changeLabel="employees checked in"
        />

        <MetricCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={attendanceRate > 85 ? "up" : "down"}
          color={attendanceRate > 85 ? "green" : "yellow"}
          changeLabel="Target: 90%"
        />

        <MetricCard
          title="Pending Leaves"
          value={dashboardData.pendingLeaves}
          icon={<Calendar className="h-5 w-5" />}
          color="yellow"
          changeLabel="awaiting approval"
        />

        <MetricCard
          title="Active Violations"
          value={dashboardData.recentViolations.filter(v => v.penaltyTriggered).length}
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
          changeLabel="violations recorded"
        />
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {format(lastRefresh, "h:mm a")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={dashboardLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${dashboardLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Attendance Chart */}
      <AttendanceChart
        data={trendsData}
        loading={trendsLoading}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leave Requests */}
        <LeaveRequests
          requests={leaveRequestsData}
          loading={leavesLoading}
          onApprove={async (id) => {
            await submitLeaveDecision({
              requestId: id,
              action: "approve"
            });
            handleRefresh();
          }}
          onReject={async (id) => {
            await submitLeaveDecision({
              requestId: id,
              action: "reject",
              notes: "Rejected by admin review"
            });
            handleRefresh();
          }}
        />

        {/* Recent Attendance */}
        <AttendanceTable
          records={checkInRecords}
          loading={attendanceLoading}
        />
      </div>

      {/* Audit Logs */}
      <AuditLogList
        logs={auditLogs}
        loading={auditLogsLoading}
      />
    </div>
  );
}