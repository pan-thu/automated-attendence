"use client";

import { format } from "date-fns";
import { MapPin, Clock, AlertCircle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CheckInRecord {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
  };
  checkType: "check1" | "check2" | "check3";
  status: "on_time" | "late" | "early_leave" | "missed";
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  isMocked?: boolean;
}

interface AttendanceTableProps {
  records: CheckInRecord[];
  loading?: boolean;
}

const checkTypeConfig = {
  check1: { label: "Morning", time: "8:30 AM" },
  check2: { label: "Lunch Return", time: "1:00 PM" },
  check3: { label: "Evening", time: "5:00 PM" },
};

const statusConfig = {
  on_time: {
    label: "On Time",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600"
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertCircle,
    iconColor: "text-yellow-600"
  },
  early_leave: {
    label: "Early Leave",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle,
    iconColor: "text-orange-600"
  },
  missed: {
    label: "Missed",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    iconColor: "text-red-600"
  },
};

export function AttendanceTable({ records, loading = false }: AttendanceTableProps) {
  // Sort records by timestamp (most recent first)
  const sortedRecords = [...records].sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Today's Check-ins</CardTitle>
          <CardDescription>
            Real-time check-ins for today
          </CardDescription>
        </div>
        <Link href="/attendance">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MinusCircle className="mb-3 h-12 w-12 text-gray-400" />
            <p className="text-sm font-medium">No check-ins today</p>
            <p className="text-xs text-muted-foreground">Check-ins will appear here as employees clock in</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Check Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedRecords.slice(0, 10).map((record) => {
                  const StatusIcon = statusConfig[record.status].icon;
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={record.employee.avatar} alt={record.employee.name} />
                            <AvatarFallback className="text-xs">
                              {record.employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{record.employee.name}</p>
                            <p className="text-xs text-muted-foreground">{record.employee.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {checkTypeConfig[record.checkType].label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Expected: {checkTypeConfig[record.checkType].time}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn("gap-1", statusConfig[record.status].color)}
                        >
                          <StatusIcon className={cn("h-3 w-3", statusConfig[record.status].iconColor)} />
                          {statusConfig[record.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(record.timestamp, "h:mm a")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {record.location ? (
                            <>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Within office
                              </span>
                              {record.isMocked && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                  Mock GPS
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}