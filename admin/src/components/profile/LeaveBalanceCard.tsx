"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveType {
  type: string;
  used: number;
  total: number;
  color: string;
}

interface LeaveBalanceCardProps {
  leaveBalances?: Record<string, number>;
  usedLeaves?: Record<string, number>;
  loading?: boolean;
}

const leaveTypeConfig: Record<string, { label: string; color: string }> = {
  full: { label: "Full Leave", color: "bg-blue-500" },
  medical: { label: "Medical Leave", color: "bg-red-500" },
  maternity: { label: "Maternity Leave", color: "bg-pink-500" },
  // Firebase field mappings
  fullLeaveBalance: { label: "Full Leave", color: "bg-blue-500" },
  medicalLeaveBalance: { label: "Medical Leave", color: "bg-red-500" },
  maternityLeaveBalance: { label: "Maternity Leave", color: "bg-pink-500" },
  // Legacy mappings for backward compatibility
  annual: { label: "Full Leave", color: "bg-blue-500" },
  sick: { label: "Medical Leave", color: "bg-red-500" },
  personal: { label: "Full Leave", color: "bg-blue-500" },
  paternity: { label: "Maternity Leave", color: "bg-pink-500" },
  unpaid: { label: "Full Leave", color: "bg-blue-500" },
  other: { label: "Full Leave", color: "bg-blue-500" }
};

export function LeaveBalanceCard({
  leaveBalances = {},
  usedLeaves = {},
  loading = false
}: LeaveBalanceCardProps) {
  // Valid leave types to display
  const validLeaveTypes = ['fullLeaveBalance', 'medicalLeaveBalance', 'maternityLeaveBalance', 'full', 'medical', 'maternity'];

  // Transform leave balances to include used/total, filtering only valid types
  const leaveTypes: LeaveType[] = Object.entries(leaveBalances)
    .filter(([type]) => validLeaveTypes.includes(type))
    .map(([type, total]) => {
      const config = leaveTypeConfig[type] || { label: type, color: "bg-gray-500" };
      // Get actual used leaves from props, default to 0
      const used = usedLeaves[type] || 0;

      return {
        type: config.label,
        used,
        total,
        color: config.color
      };
    });

  const totalLeaves = leaveTypes.reduce((acc, leave) => acc + leave.total, 0);
  const totalUsedLeaves = leaveTypes.reduce((acc, leave) => acc + leave.used, 0);
  const remainingLeaves = totalLeaves - totalUsedLeaves;
  const usagePercentage = totalLeaves > 0 ? (totalUsedLeaves / totalLeaves) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balance
          </span>
          <Badge variant="secondary" className="font-normal">
            {remainingLeaves} days remaining
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No leave balance information available
          </div>
        ) : (
          <>
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Usage</span>
                <span className="font-medium">{totalUsedLeaves} / {totalLeaves} days</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usagePercentage.toFixed(0)}% of annual leave used
              </p>
            </div>

            {/* Individual Leave Types */}
            <div className="space-y-4">
              {leaveTypes.map((leave) => {
                const percentage = leave.total > 0 ? (leave.used / leave.total) * 100 : 0;
                const remaining = leave.total - leave.used;

                return (
                  <div key={leave.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", leave.color)} />
                        <span className="text-sm font-medium">{leave.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {remaining} left
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={percentage}
                        className="flex-1 h-1.5"
                        indicatorClassName={leave.color}
                      />
                      <span className="text-xs font-medium min-w-[40px] text-right">
                        {leave.used}/{leave.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning if low balance */}
            {remainingLeaves < 5 && remainingLeaves > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Low leave balance. Only {remainingLeaves} days remaining for the year.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}