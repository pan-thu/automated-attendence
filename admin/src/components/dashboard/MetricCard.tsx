"use client";

import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "red" | "yellow" | "blue" | "gray";
  className?: string;
  onClick?: () => void;
}

const colorMap = {
  green: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: "text-green-600",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: "text-red-600",
  },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    icon: "text-yellow-600",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "text-blue-600",
  },
  gray: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: "text-gray-600",
  },
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  color = "gray",
  className,
  onClick,
}: MetricCardProps) {
  const colors = colorMap[color];
  const isClickable = !!onClick;

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const ChangeIcon = change && change > 0 ? ArrowUp : change && change < 0 ? ArrowDown : Minus;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isClickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn("rounded-lg p-2", colors.bg, colors.icon)}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {trend !== "neutral" && (
            <TrendIcon className={cn("h-5 w-5", colors.icon)} />
          )}
        </div>
        {(change !== undefined || changeLabel) && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {change !== undefined && (
              <>
                <ChangeIcon
                  className={cn(
                    "h-3 w-3",
                    change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "font-medium",
                    change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"
                  )}
                >
                  {change > 0 ? "+" : ""}{change}%
                </span>
              </>
            )}
            {changeLabel && (
              <span className="text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>

      {/* Decorative gradient overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-1",
          color === "green" && "bg-gradient-to-r from-green-400 to-green-600",
          color === "red" && "bg-gradient-to-r from-red-400 to-red-600",
          color === "yellow" && "bg-gradient-to-r from-yellow-400 to-yellow-600",
          color === "blue" && "bg-gradient-to-r from-blue-400 to-blue-600",
          color === "gray" && "bg-gradient-to-r from-gray-400 to-gray-600"
        )}
      />
    </Card>
  );
}