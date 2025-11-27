"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRangeConfig } from "./ReportBuilder";
import { startOfToday, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfToday, endOfWeek, endOfMonth, endOfQuarter, endOfYear, differenceInDays } from "date-fns";

interface DateRangeCardProps {
  value: DateRangeConfig;
  onChange: (value: DateRangeConfig) => void;
}

const quickOptions = [
  { value: "today" as const, label: "Today" },
  { value: "week" as const, label: "This Week" },
  { value: "month" as const, label: "This Month" },
  { value: "quarter" as const, label: "This Quarter" },
  { value: "year" as const, label: "This Year" }
];

function getQuickDateRange(type: string): { start: Date; end: Date } {
  const now = new Date();
  switch (type) {
    case "today":
      return { start: startOfToday(), end: endOfToday() };
    case "week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function DateRangeCard({ value, onChange }: DateRangeCardProps) {
  const handleQuickSelect = (quick: typeof quickOptions[number]["value"]) => {
    onChange({
      type: "quick",
      quick
    });
  };

  const handleCustomStart = (dateStr: string) => {
    const date = new Date(dateStr);
    onChange({
      type: "custom",
      start: date,
      end: value.end
    });
  };

  const handleCustomEnd = (dateStr: string) => {
    const date = new Date(dateStr);
    onChange({
      type: "custom",
      start: value.start,
      end: date
    });
  };

  // Calculate days in range
  let daysInRange = 0;
  if (value.type === "quick" && value.quick) {
    const range = getQuickDateRange(value.quick);
    daysInRange = differenceInDays(range.end, range.start) + 1;
  } else if (value.type === "custom" && value.start && value.end) {
    daysInRange = differenceInDays(value.end, value.start) + 1;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-blue-600" />
          Date Range
        </CardTitle>
        <CardDescription>Select the time period for your report</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Select Pills */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleQuickSelect(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  value.type === "quick" && value.quick === option.value
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Custom Range</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={value.start ? value.start.toISOString().split('T')[0] : ''}
                onChange={(e) => handleCustomStart(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={value.end ? value.end.toISOString().split('T')[0] : ''}
                onChange={(e) => handleCustomEnd(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {/* Date Info */}
        {daysInRange > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Report will cover <span className="font-semibold">{daysInRange} {daysInRange === 1 ? "day" : "days"}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
