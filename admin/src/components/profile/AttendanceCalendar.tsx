"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface AttendanceDay {
  date: Date;
  status: "present" | "absent" | "half-absent" | "late" | "early-leave" | "on-leave" | "weekend" | null;
  checkIn?: string;
  checkOut?: string;
}

interface AttendanceCalendarProps {
  attendance?: AttendanceDay[];
  loading?: boolean;
}

const statusConfig = {
  present: {
    label: "Present",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle
  },
  "half-absent": {
    label: "Half-Absent",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertCircle
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock
  },
  "early-leave": {
    label: "Early Leave",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle
  },
  "on-leave": {
    label: "On Leave",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CalendarIcon
  },
  weekend: {
    label: "Weekend",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: null
  }
};

export function AttendanceCalendar({ attendance = [], loading = false }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the week (0 = Sunday)
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  // Get attendance for a specific day from props
  const getAttendanceForDay = (date: Date): AttendanceDay | null => {
    // Check if it's weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { date, status: "weekend" };
    }

    // Find attendance record for this date
    const record = attendance.find(att =>
      att.date && isSameDay(new Date(att.date), date)
    );

    if (record) {
      return record;
    }

    // No record for past dates means absent (if date is in the past)
    if (date < new Date() && date.toDateString() !== new Date().toDateString()) {
      return { date, status: null }; // No data available
    }

    return null; // Future date
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const selectedDayAttendance = selectedDate ? getAttendanceForDay(selectedDate) : null;

  // Calculate statistics from actual attendance data for the current month
  const monthStats = monthDays.reduce((stats, day) => {
    const dayData = getAttendanceForDay(day);
    if (dayData && dayData.status && dayData.status !== "weekend") {
      switch (dayData.status) {
        case "present":
          stats.present++;
          break;
        case "absent":
          stats.absent++;
          break;
        case "half-absent":
          stats.halfAbsent++;
          break;
        case "late":
          stats.late++;
          break;
        case "early-leave":
          stats.earlyLeave++;
          break;
        case "on-leave":
          stats.onLeave++;
          break;
      }
    }
    return stats;
  }, { present: 0, absent: 0, halfAbsent: 0, late: 0, earlyLeave: 0, onLeave: 0 });

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.earlyLeave}</p>
                <p className="text-xs text-muted-foreground">Early Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.halfAbsent}</p>
                <p className="text-xs text-muted-foreground">Half-Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">{monthStats.onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Attendance Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Empty cells for alignment */}
                {emptyDays.map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Calendar Days */}
                {monthDays.map(day => {
                  const dayAttendance = getAttendanceForDay(day);
                  const status = dayAttendance?.status;
                  const config = status ? statusConfig[status] : null;
                  const Icon = config?.icon;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square rounded-lg border p-2 transition-all hover:shadow-md",
                        status && config ? config.color : "bg-white",
                        isSelected && "ring-2 ring-primary ring-offset-2",
                        isTodayDate && "font-bold",
                        "relative"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className={cn(
                          "text-sm",
                          status === "weekend" && "text-gray-400"
                        )}>
                          {format(day, "d")}
                        </span>
                        {Icon && (
                          <Icon className="h-3 w-3 mt-1" />
                        )}
                      </div>
                      {isTodayDate && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, config]) => {
                  if (key === "weekend") return null;
                  const Icon = config.icon;
                  return (
                    <Badge
                      key={key}
                      variant="outline"
                      className={cn("gap-1", config.color)}
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                      {config.label}
                    </Badge>
                  );
                })}
              </div>

              {/* Selected Day Details */}
              {selectedDayAttendance && selectedDayAttendance.status && selectedDayAttendance.status !== "weekend" && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {format(selectedDate!, "EEEE, MMMM d, yyyy")}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          {selectedDayAttendance.checkIn && (
                            <span>Check-in: {selectedDayAttendance.checkIn}</span>
                          )}
                          {selectedDayAttendance.checkOut && (
                            <span>Check-out: {selectedDayAttendance.checkOut}</span>
                          )}
                        </div>
                      </div>
                      {statusConfig[selectedDayAttendance.status] && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            statusConfig[selectedDayAttendance.status].color
                          )}
                        >
                          {(() => {
                            const StatusIcon = statusConfig[selectedDayAttendance.status].icon;
                            return StatusIcon ? <StatusIcon className="h-3 w-3" /> : null;
                          })()}
                          {statusConfig[selectedDayAttendance.status].label}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}