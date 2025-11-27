"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  DollarSign,
  Calendar,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Penalty {
  id: string;
  amount: number;
  reason: string;
  violationDate: Date;
  issuedDate: Date;
  status: "active" | "waived" | "paid";
  violationType: "absent" | "half_day_absent" | "half-absent" | "late" | "early_leave" | "early-leave";
  acknowledgedAt?: Date;
  waivedAt?: Date;
  waivedBy?: string;
  waivedReason?: string;
  // New daily penalty fields
  isWarning?: boolean;
  violationCount?: number;
  threshold?: number;
  dateKey?: string;
  violationField?: string;
}

interface PenaltiesCardProps {
  penalties?: Penalty[];
  loading?: boolean;
  onViewAll?: () => void;
  onWaivePenalty?: (penaltyId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: {
    label: "Active",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock
  },
  waived: {
    label: "Waived",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle
  },
  paid: {
    label: "Paid",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: CheckCircle
  }
};

const violationTypeConfig: Record<string, { label: string; color: string }> = {
  absent: {
    label: "Absent",
    color: "text-red-600"
  },
  half_day_absent: {
    label: "Half-Day Absent",
    color: "text-orange-600"
  },
  "half-absent": {
    label: "Half-Absent",
    color: "text-orange-600"
  },
  late: {
    label: "Late",
    color: "text-yellow-600"
  },
  early_leave: {
    label: "Early Leave",
    color: "text-amber-600"
  },
  "early-leave": {
    label: "Early Leave",
    color: "text-amber-600"
  }
};

export function PenaltiesCard({
  penalties = [],
  loading = false,
  onViewAll,
  onWaivePenalty
}: PenaltiesCardProps) {
  const [expandedPenalty, setExpandedPenalty] = useState<string | null>(null);

  // Separate warnings from actual fines
  const warnings = penalties.filter(p => p.isWarning === true);
  const actualFines = penalties.filter(p => p.isWarning !== true);

  const activePenalties = actualFines.filter(p => p.status === "active");
  const totalActive = activePenalties.reduce((sum, p) => sum + p.amount, 0);
  const waivedPenalties = penalties.filter(p => p.status === "waived");
  const totalWaived = waivedPenalties.reduce((sum, p) => sum + p.amount, 0);

  // Get recent penalties (last 5)
  const recentPenalties = penalties.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Penalties & Violations
          </CardTitle>
          {onViewAll && penalties.length > 3 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : penalties.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium">No penalties</p>
            <p className="text-xs text-muted-foreground mt-1">
              Great attendance record!
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-primary">{penalties.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-xl font-bold text-orange-700">{warnings.length}</p>
                <p className="text-xs text-orange-600">Warnings</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xl font-bold text-red-700">${totalActive}</p>
                <p className="text-xs text-red-600">Active Fines</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xl font-bold text-green-700">${totalWaived}</p>
                <p className="text-xs text-green-600">Waived</p>
              </div>
            </div>

            {/* Recent Penalties */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Penalties</h4>
              {recentPenalties.map((penalty) => {
                const isExpanded = expandedPenalty === penalty.id;
                const statusCfg = statusConfig[penalty.status] || statusConfig.active;
                const StatusIcon = statusCfg.icon;
                const violationConfig = violationTypeConfig[penalty.violationType] || { label: penalty.violationType, color: "text-gray-600" };

                return (
                  <div
                    key={penalty.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      penalty.isWarning && "border-orange-200 bg-orange-50/50",
                      !penalty.isWarning && penalty.status === "active" && "border-red-200 bg-red-50/50",
                      penalty.status === "waived" && "border-green-200 bg-green-50/50",
                      isExpanded && "shadow-md"
                    )}
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedPenalty(isExpanded ? null : penalty.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {penalty.isWarning ? (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Warning
                            </Badge>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">${penalty.amount}</span>
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className={cn("text-xs", violationConfig.color)}
                          >
                            {violationConfig.label}
                          </Badge>
                          {penalty.violationCount && penalty.threshold && (
                            <span className="text-xs text-muted-foreground">
                              ({penalty.violationCount}/{penalty.threshold} threshold)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(penalty.violationDate, "MMM dd, yyyy")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusCfg.color)}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="text-xs space-y-1">
                          <p>
                            <span className="text-muted-foreground">Reason:</span>{" "}
                            <span className="font-medium">{penalty.reason}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Issued:</span>{" "}
                            {format(penalty.issuedDate, "MMM dd, yyyy")}
                          </p>
                          {penalty.acknowledgedAt && (
                            <p>
                              <span className="text-muted-foreground">Acknowledged:</span>{" "}
                              {format(penalty.acknowledgedAt, "MMM dd, yyyy")}
                            </p>
                          )}
                          {penalty.waivedAt && (
                            <>
                              <p>
                                <span className="text-muted-foreground">Waived by:</span>{" "}
                                {penalty.waivedBy}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Waive reason:</span>{" "}
                                {penalty.waivedReason}
                              </p>
                            </>
                          )}
                        </div>
                        {penalty.status === "active" && onWaivePenalty && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWaivePenalty(penalty.id);
                            }}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Waive Penalty
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trend Indicator */}
            {penalties.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">This Month</span>
                  <div className="flex items-center gap-1">
                    {activePenalties.length > 2 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-600">
                          High violation rate
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">
                          Improving attendance
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}