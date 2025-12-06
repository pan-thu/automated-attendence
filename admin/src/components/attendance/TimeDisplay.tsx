"use client";

import { Clock, MapPin, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeDisplayProps {
  time?: Date | null;
  status?: "on_time" | "late" | "early" | "missed" | null;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  isMocked?: boolean;
  label?: string;
  showLocation?: boolean;
}

const statusConfig = {
  on_time: {
    color: "text-green-600",
    dotColor: "bg-green-500",
    icon: CheckCircle,
    label: "On Time"
  },
  late: {
    color: "text-yellow-600",
    dotColor: "bg-yellow-500",
    icon: Clock,
    label: "Late"
  },
  early: {
    color: "text-orange-600",
    dotColor: "bg-orange-500",
    icon: AlertTriangle,
    label: "Early"
  },
  // Missed config kept for reference but overridden by logic below
  missed: {
    color: "text-red-600",
    dotColor: "bg-red-500",
    icon: XCircle,
    label: "Missed"
  }
};

export function TimeDisplay({
  time,
  status,
  location,
  isMocked = false,
  label,
  showLocation = false
}: TimeDisplayProps) {
  // If time is missing OR status is explicitly 'missed', return simple dash
  if (!time || status === "missed") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">—</span>
      </div>
    );
  }

  const config = status ? statusConfig[status as keyof typeof statusConfig] : null;
  const Icon = config?.icon;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {/* Time */}
        <span className={cn(
          "text-sm font-medium",
          config?.color || "text-gray-900"
        )}>
          {format(time, "hh:mm a")}
        </span>

        {/* Status Dot */}
        {status && (
          <div className="relative">
            <div className={cn(
              "h-2 w-2 rounded-full",
              config?.dotColor || "bg-gray-400"
            )} />
            {status === "late" && (
              <div className={cn(
                "absolute inset-0 h-2 w-2 rounded-full animate-ping",
                config?.dotColor
              )} />
            )}
          </div>
        )}

        {/* Status Icon (on hover tooltip) */}
        {Icon && (
          <div className="group relative">
            <Icon className={cn("h-3.5 w-3.5", config?.color)} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {config?.label}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Info */}
      {showLocation && location && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>
            {location.accuracy ? `±${location.accuracy}m` : "Location verified"}
          </span>
          {isMocked && (
            <span className="text-red-500 font-medium ml-1">(Mock)</span>
          )}
        </div>
      )}
    </div>
  );
}