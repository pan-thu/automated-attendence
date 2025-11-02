"use client";

import { useMemo } from "react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-radix";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceData {
  date: string;
  dateKey: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  halfDay?: number;
  isFuture?: boolean;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  loading?: boolean;
  selectedMonth: number; // 0-indexed (0 = January)
  selectedYear: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

export function AttendanceChart({
  data,
  loading = false,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: AttendanceChartProps) {
  // Filter out future dates from the chart (show them but with 0 values)
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      // Don't show data for future dates
      present: item.isFuture ? 0 : item.present,
      absent: item.isFuture ? 0 : item.absent,
      late: item.isFuture ? 0 : item.late,
      onLeave: item.isFuture ? 0 : item.onLeave,
      halfDay: item.isFuture ? 0 : (item.halfDay || 0),
    }));
  }, [data]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange?.(11);
      onYearChange?.(selectedYear - 1);
    } else {
      onMonthChange?.(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onMonthChange?.(0);
      onYearChange?.(selectedYear + 1);
    } else {
      onMonthChange?.(selectedMonth + 1);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="mb-2 font-medium">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="capitalize">{entry.name}:</span>
              </span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Attendance Trends</CardTitle>
          <CardDescription>
            Daily attendance metrics for {months[selectedMonth]} {selectedYear}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => onMonthChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="flex h-[350px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "#6b7280" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "#6b7280" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="present"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Present"
              />
              <Line
                type="monotone"
                dataKey="late"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Late"
              />
              <Line
                type="monotone"
                dataKey="absent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Absent"
              />
              <Line
                type="monotone"
                dataKey="onLeave"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="On Leave"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}