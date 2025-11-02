"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: {
    quickFilter: string;
    dateRange: { start: Date | null; end: Date | null };
    status: string;
    employee: string;
    source: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  onExport: () => void;
  onRefresh: () => void;
  onManualEntry?: () => void;
  isLoading?: boolean;
  employees?: Array<{ id: string; name: string }>;
  summary?: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    issues: number;
  };
}

const quickFilters = [
  { value: "today", label: "Today", icon: Calendar },
  { value: "week", label: "This Week", icon: Calendar },
  { value: "late", label: "Late Arrivals", icon: Clock },
  { value: "missing", label: "Missing Check-out", icon: AlertCircle },
  { value: "issues", label: "Issues", icon: XCircle }
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "present", label: "Present", color: "bg-green-100 text-green-700" },
  { value: "late", label: "Late", color: "bg-yellow-100 text-yellow-700" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700" },
  { value: "half_day", label: "Half Day", color: "bg-orange-100 text-orange-700" },
  { value: "on_leave", label: "On Leave", color: "bg-blue-100 text-blue-700" }
];

const sourceOptions = [
  { value: "all", label: "All Sources" },
  { value: "app", label: "App", icon: "📱" },
  { value: "manual", label: "Manual", icon: "✏️" },
  { value: "system", label: "System", icon: "⚙️" }
];

export function FilterBar({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  onManualEntry,
  isLoading = false,
  employees = [],
  summary
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQuickFilter = (value: string) => {
    const today = new Date();
    let dateRange = { start: null as Date | null, end: null as Date | null };

    switch (value) {
      case "today":
        dateRange = { start: today, end: today };
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        dateRange = { start: weekStart, end: today };
        break;
    }

    onFiltersChange({
      ...filters,
      quickFilter: value,
      dateRange,
      status: value === "late" ? "late" : filters.status
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Present</span>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{summary.present}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-600">Late</span>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{summary.late}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">Absent</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.absent}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">On Leave</span>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.onLeave}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-600">Issues</span>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">{summary.issues}</p>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
          {quickFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => handleQuickFilter(filter.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filters.quickFilter === filter.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {onManualEntry && (
            <Button
              size="sm"
              onClick={onManualEntry}
            >
              Manual Entry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).filter(v => v && v !== "all").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(filters).filter(v => v && v !== "all").length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid gap-4 md:grid-cols-5 p-4 bg-gray-50 rounded-lg">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or ID..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={filters.employee}
              onChange={(e) => onFiltersChange({ ...filters, employee: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={filters.source}
              onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-2 flex items-center gap-2">
            <Input
              type="date"
              value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  start: e.target.value ? new Date(e.target.value) : null
                }
              })}
              className="flex-1"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  end: e.target.value ? new Date(e.target.value) : null
                }
              })}
              className="flex-1"
            />
          </div>

          {/* Clear Filters */}
          <div className="md:col-span-3 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({
                quickFilter: "today",
                dateRange: { start: new Date(), end: new Date() },
                status: "all",
                employee: "",
                source: "all",
                search: ""
              })}
            >
              Clear all filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}