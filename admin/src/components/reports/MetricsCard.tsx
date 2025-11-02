"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart3, Calendar, Shield } from "lucide-react";
import type { MetricsConfig } from "./ReportBuilder";

interface MetricsCardProps {
  value: MetricsConfig;
  onChange: (value: MetricsConfig) => void;
}

const metricCategories = [
  {
    key: "attendance" as const,
    title: "Attendance Metrics",
    icon: BarChart3,
    color: "text-blue-600",
    options: [
      { value: "summary", label: "Attendance Summary", description: "Overall attendance statistics" },
      { value: "lateArrivals", label: "Late Arrivals", description: "Track tardiness patterns" },
      { value: "earlyLeaves", label: "Early Departures", description: "Early clock-out records" },
      { value: "absences", label: "Absences", description: "Complete absence tracking" },
      { value: "overtime", label: "Overtime Hours", description: "Extra work hours" }
    ]
  },
  {
    key: "leaves" as const,
    title: "Leave Metrics",
    icon: Calendar,
    color: "text-green-600",
    options: [
      { value: "usage", label: "Leave Usage", description: "Leave days utilized" },
      { value: "balance", label: "Leave Balance", description: "Remaining leave days" },
      { value: "patterns", label: "Leave Patterns", description: "Common leave trends" },
      { value: "requests", label: "Leave Requests", description: "Pending and approved requests" }
    ]
  },
  {
    key: "penalties" as const,
    title: "Penalty Metrics",
    icon: Shield,
    color: "text-orange-600",
    options: [
      { value: "records", label: "Penalty Records", description: "All penalty instances" },
      { value: "amounts", label: "Penalty Amounts", description: "Financial penalties" },
      { value: "trends", label: "Violation Trends", description: "Pattern analysis" },
      { value: "waivers", label: "Waived Penalties", description: "Forgiven violations" }
    ]
  }
];

export function MetricsCard({ value, onChange }: MetricsCardProps) {
  const handleToggle = (category: keyof MetricsConfig, metric: string, checked: boolean) => {
    const currentMetrics = value[category];
    const updatedMetrics = checked
      ? [...currentMetrics, metric]
      : currentMetrics.filter(m => m !== metric);

    onChange({
      ...value,
      [category]: updatedMetrics
    });
  };

  const totalSelected = [
    ...value.attendance,
    ...value.leaves,
    ...value.penalties
  ].length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Metrics Selection
          {totalSelected > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
              {totalSelected} selected
            </span>
          )}
        </CardTitle>
        <CardDescription>Choose the data points to include</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {metricCategories.map((category) => {
          const Icon = category.icon;
          const selectedCount = value[category.key].length;

          return (
            <div key={category.key} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${category.color}`} />
                <h4 className="text-sm font-semibold text-gray-900">
                  {category.title}
                </h4>
                {selectedCount > 0 && (
                  <span className="text-xs text-gray-500">
                    ({selectedCount})
                  </span>
                )}
              </div>

              {/* Metric Options */}
              <div className="space-y-2 pl-6">
                {category.options.map((option) => {
                  const isChecked = value[category.key].includes(option.value);

                  return (
                    <div
                      key={option.value}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        id={`${category.key}-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleToggle(category.key, option.value, !!checked)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`${category.key}-${option.value}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {option.label}
                        </Label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
