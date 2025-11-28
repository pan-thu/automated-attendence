"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveType {
  type: string;
  key: string;
  remaining: number;
  total: number;
  used: number;
  color: string;
}

interface LeaveBalanceCardProps {
  leaveBalances?: Record<string, number>;  // Remaining balance per type
  leavePolicy?: Record<string, number>;    // Original total from company settings
  loading?: boolean;
}

const leaveTypeConfig: Record<string, { label: string; color: string; policyKey: string }> = {
  // Firebase field mappings (employee.leaveBalances keys)
  fullLeaveBalance: { label: "Full Leave", color: "bg-blue-500", policyKey: "fullLeaveBalance" },
  medicalLeaveBalance: { label: "Medical Leave", color: "bg-red-500", policyKey: "medicalLeaveBalance" },
  maternityLeaveBalance: { label: "Maternity Leave", color: "bg-pink-500", policyKey: "maternityLeaveBalance" },
  // Short form keys
  full: { label: "Full Leave", color: "bg-blue-500", policyKey: "fullLeaveBalance" },
  medical: { label: "Medical Leave", color: "bg-red-500", policyKey: "medicalLeaveBalance" },
  maternity: { label: "Maternity Leave", color: "bg-pink-500", policyKey: "maternityLeaveBalance" },
};

// Find matching policy value with case-insensitive matching
const findPolicyValue = (policy: Record<string, number>, key: string): number | null => {
  // Direct match
  if (key in policy) return policy[key];

  // Case-insensitive match
  const lowerKey = key.toLowerCase();
  for (const [pKey, value] of Object.entries(policy)) {
    if (pKey.toLowerCase() === lowerKey) return value;
  }

  return null;
};

export function LeaveBalanceCard({
  leaveBalances = {},
  leavePolicy = {},
  loading = false
}: LeaveBalanceCardProps) {
  // Valid leave types to display
  const validLeaveTypes = ['fullLeaveBalance', 'medicalLeaveBalance', 'maternityLeaveBalance', 'full', 'medical', 'maternity'];

  // Transform leave balances to include used/total, filtering only valid types
  const leaveTypes: LeaveType[] = Object.entries(leaveBalances)
    .filter(([type]) => validLeaveTypes.includes(type))
    .map(([type, remaining]) => {
      const config = leaveTypeConfig[type] || { label: type, color: "bg-gray-500", policyKey: type };

      // Get original total from company policy, fallback to remaining if not found
      const policyTotal = findPolicyValue(leavePolicy, config.policyKey)
        ?? findPolicyValue(leavePolicy, type)
        ?? remaining;

      // Calculate used = original total - remaining
      const used = Math.max(0, policyTotal - remaining);

      return {
        type: config.label,
        key: type,
        remaining,
        total: policyTotal,
        used,
        color: config.color
      };
    });

  const totalRemaining = leaveTypes.reduce((acc, leave) => acc + leave.remaining, 0);
  const totalPolicy = leaveTypes.reduce((acc, leave) => acc + leave.total, 0);
  const totalUsed = leaveTypes.reduce((acc, leave) => acc + leave.used, 0);
  const usagePercentage = totalPolicy > 0 ? (totalUsed / totalPolicy) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balance
          </span>
          <Badge variant="secondary" className="font-normal">
            {totalRemaining} days remaining
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
                <span className="font-medium">{totalUsed} / {totalPolicy} days used</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usagePercentage.toFixed(0)}% of total leave used
              </p>
            </div>

            {/* Individual Leave Types */}
            <div className="space-y-4">
              {leaveTypes.map((leave) => {
                const percentage = leave.total > 0 ? (leave.used / leave.total) * 100 : 0;

                return (
                  <div key={leave.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", leave.color)} />
                        <span className="text-sm font-medium">{leave.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {leave.remaining} left
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={percentage}
                        className="flex-1 h-1.5"
                        indicatorClassName={leave.color}
                      />
                      <span className="text-xs font-medium min-w-[50px] text-right">
                        {leave.used}/{leave.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning if low balance */}
            {totalRemaining < 5 && totalRemaining > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Low leave balance. Only {totalRemaining} days remaining for the year.
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