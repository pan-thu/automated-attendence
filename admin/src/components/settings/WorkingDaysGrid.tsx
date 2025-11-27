"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WorkingDaysGridProps {
  value: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
  disabled?: boolean;
}

const days = [
  { key: "monday", label: "Monday", short: "Mon", initial: "M" },
  { key: "tuesday", label: "Tuesday", short: "Tue", initial: "T" },
  { key: "wednesday", label: "Wednesday", short: "Wed", initial: "W" },
  { key: "thursday", label: "Thursday", short: "Thu", initial: "T" },
  { key: "friday", label: "Friday", short: "Fri", initial: "F" },
  { key: "saturday", label: "Saturday", short: "Sat", initial: "S" },
  { key: "sunday", label: "Sunday", short: "Sun", initial: "S" }
];

export function WorkingDaysGrid({
  value,
  onChange,
  disabled = false
}: WorkingDaysGridProps) {
  const toggleDay = (dayKey: string) => {
    if (disabled) return;
    onChange({
      ...value,
      [dayKey]: !value[dayKey]
    });
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const isActive = value[day.key];

        return (
          <button
            key={day.key}
            type="button"
            onClick={() => toggleDay(day.key)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              "hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              isActive
                ? "bg-blue-50 border-blue-500"
                : "bg-white border-gray-200",
              disabled && "opacity-50 cursor-not-allowed hover:border-gray-200"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg",
              isActive
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
            )}>
              {isActive ? (
                <Check className="h-5 w-5" />
              ) : (
                day.initial
              )}
            </div>
            <span className={cn(
              "text-xs font-medium",
              isActive ? "text-blue-700" : "text-gray-600"
            )}>
              {day.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}
