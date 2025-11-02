"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Timer,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CheckStatus {
  time?: string;
  status: "on_time" | "late" | "early_leave" | "missed" | "pending";
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface TodayStatusCardProps {
  attendanceToday?: {
    check1?: CheckStatus;
    check2?: CheckStatus;
    check3?: CheckStatus;
    overallStatus?: "present" | "absent" | "half_day" | "on_leave" | "weekend";
    workingHours?: number;
    requiredHours?: number;
  };
  loading?: boolean;
}

const checkConfig = {
  check1: {
    label: "Morning Check-in",
    timeWindow: "08:30 - 09:15",
    icon: Clock
  },
  check2: {
    label: "Lunch Return",
    timeWindow: "13:00 - 14:00",
    icon: Clock
  },
  check3: {
    label: "Evening Check-out",
    timeWindow: "16:45 - 17:30",
    icon: Clock
  }
};

const statusConfig = {
  on_time: {
    label: "On Time",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertCircle
  },
  early_leave: {
    label: "Early Leave",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle
  },
  missed: {
    label: "Missed",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle
  },
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: Clock
  }
};

const overallStatusConfig = {
  present: {
    label: "Present",
    color: "bg-green-100 text-green-700",
    description: "All check-ins completed"
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-700",
    description: "No check-ins recorded"
  },
  half_day: {
    label: "Half Day",
    color: "bg-orange-100 text-orange-700",
    description: "Partial attendance"
  },
  on_leave: {
    label: "On Leave",
    color: "bg-blue-100 text-blue-700",
    description: "Approved leave"
  },
  weekend: {
    label: "Weekend",
    color: "bg-gray-100 text-gray-500",
    description: "Non-working day"
  }
};

export function TodayStatusCard({ attendanceToday, loading = false }: TodayStatusCardProps) {
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  // Mock data for demonstration
  const mockAttendance = attendanceToday || {
    check1: {
      time: "08:35 AM",
      status: "on_time" as const,
      location: { latitude: 0, longitude: 0 }
    },
    check2: {
      time: "13:10 PM",
      status: "late" as const,
      location: { latitude: 0, longitude: 0 }
    },
    check3: {
      status: "pending" as const
    },
    overallStatus: "present" as const,
    workingHours: 5.5,
    requiredHours: 8
  };

  const completedChecks = [
    mockAttendance.check1?.status !== "pending" && mockAttendance.check1?.status !== "missed",
    mockAttendance.check2?.status !== "pending" && mockAttendance.check2?.status !== "missed",
    mockAttendance.check3?.status !== "pending" && mockAttendance.check3?.status !== "missed"
  ].filter(Boolean).length;

  const progressPercentage = (completedChecks / 3) * 100;
  const hoursPercentage = mockAttendance.workingHours && mockAttendance.requiredHours
    ? (mockAttendance.workingHours / mockAttendance.requiredHours) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Status
          </span>
          {mockAttendance.overallStatus && (
            <Badge
              variant="outline"
              className={cn("font-normal", overallStatusConfig[mockAttendance.overallStatus].color)}
            >
              {overallStatusConfig[mockAttendance.overallStatus].label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isWeekend && !mockAttendance.check1 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">It's the weekend!</p>
            <p className="text-xs text-muted-foreground mt-1">No attendance required today</p>
          </div>
        ) : (
          <>
            {/* Date and Overall Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{format(today, "EEEE")}</p>
                <p className="text-xs text-muted-foreground">{format(today, "MMMM dd, yyyy")}</p>
              </div>
              {mockAttendance.overallStatus && (
                <p className="text-xs text-muted-foreground">
                  {overallStatusConfig[mockAttendance.overallStatus].description}
                </p>
              )}
            </div>

            {/* Check-in Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Progress</span>
                <span className="font-medium">{completedChecks} / 3 checks</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Individual Checks */}
            <div className="space-y-3">
              {(["check1", "check2", "check3"] as const).map((checkKey) => {
                const check = mockAttendance[checkKey];
                const config = checkConfig[checkKey];
                const status = check?.status || "pending";
                const statusInfo = statusConfig[status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={checkKey}
                    className={cn(
                      "p-3 rounded-lg border",
                      status === "pending" ? "bg-muted/30" : "bg-background"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={cn(
                              "h-4 w-4",
                              status === "on_time" && "text-green-600",
                              status === "late" && "text-yellow-600",
                              status === "early_leave" && "text-orange-600",
                              status === "missed" && "text-red-600",
                              status === "pending" && "text-muted-foreground"
                            )}
                          />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Window: {config.timeWindow}
                        </p>
                        {check?.time && (
                          <p className="text-xs font-medium">{check.time}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusInfo.color)}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {check?.location && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location verified</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Working Hours */}
            {mockAttendance.workingHours !== undefined && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Working Hours</span>
                  </div>
                  <span className="font-medium">
                    {mockAttendance.workingHours}h / {mockAttendance.requiredHours}h
                  </span>
                </div>
                <Progress
                  value={Math.min(hoursPercentage, 100)}
                  className="h-2"
                  indicatorClassName={hoursPercentage >= 100 ? "bg-green-500" : ""}
                />
                {hoursPercentage < 100 && (
                  <p className="text-xs text-muted-foreground">
                    {(mockAttendance.requiredHours! - mockAttendance.workingHours).toFixed(1)}h remaining
                  </p>
                )}
              </div>
            )}

            {/* Current Status */}
            {!mockAttendance.check3?.time && mockAttendance.check2?.time && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Currently checked in. Don't forget your evening check-out!
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