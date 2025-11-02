"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  User,
  Activity,
  Shield,
  AlertCircle,
  Database,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLogFiltersProps {
  filters: {
    search: string;
    category: string;
    severity: string;
    action: string;
    user: string;
    dateRange: { start: Date | null; end: Date | null };
    timeRange: string;
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  users?: Array<{ id: string; name: string; role: string }>;
  stats?: {
    total: number;
    today: number;
    critical: number;
    errors: number;
    warnings: number;
    byCategory: Record<string, number>;
  };
}

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "user", label: "User Management" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "penalty", label: "Penalty" },
  { value: "settings", label: "Settings" },
  { value: "system", label: "System" },
  { value: "authentication", label: "Authentication" }
];

const severityOptions = [
  { value: "all", label: "All Severities" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" }
];

const actionOptions = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "waive", label: "Waive" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" }
];

const timeRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" }
];

export function AuditLogFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
  users = [],
  stats
}: AuditLogFiltersProps) {
  const activeFilters = Object.values(filters).filter(v => {
    if (typeof v === "object" && v !== null) {
      return Object.values(v).some(val => val !== null);
    }
    return v && v !== "all" && v !== "";
  }).length;

  const handleQuickFilter = (severity: string) => {
    onFiltersChange({
      ...filters,
      severity
    });
  };

  const handleTimeRangeChange = (value: string) => {
    let dateRange = { start: null as Date | null, end: null as Date | null };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (value) {
      case "today":
        dateRange = { start: today, end: now };
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateRange = { start: yesterday, end: today };
        break;
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateRange = { start: weekAgo, end: now };
        break;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        dateRange = { start: monthAgo, end: now };
        break;
    }

    onFiltersChange({
      ...filters,
      timeRange: value,
      dateRange
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">Total Logs</span>
              <Database className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
          </div>

          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Today</span>
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.today}</p>
          </div>

          <button
            onClick={() => handleQuickFilter("critical")}
            className="text-left p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">Critical</span>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.critical}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("error")}
            className="text-left p-3 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-600">Errors</span>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">{stats.errors}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("warning")}
            className="text-left p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-600">Warnings</span>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.warnings}</p>
          </button>

          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-600">Auth Events</span>
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {stats.byCategory.authentication || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by action, user, description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Time Range */}
        <Select
          value={filters.timeRange}
          onValueChange={handleTimeRangeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Severity Filter */}
        <Select
          value={filters.severity}
          onValueChange={(value) => onFiltersChange({ ...filters, severity: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            {severityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {onExport && (
            <Button
              variant="outline"
              size="icon"
              onClick={onExport}
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({
                search: "",
                category: "all",
                severity: "all",
                action: "all",
                user: "",
                dateRange: { start: null, end: null },
                timeRange: "all"
              })}
            >
              Clear filters
              <Badge variant="secondary" className="ml-2">
                {activeFilters}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Action:</span>
          <Select
            value={filters.action}
            onValueChange={(value) => onFiltersChange({ ...filters, action: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Filter */}
        {users.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">User:</span>
            <Select
              value={filters.user}
              onValueChange={(value) => onFiltersChange({ ...filters, user: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom Date Range (when timeRange is "custom") */}
        {filters.timeRange === "custom" && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Custom:</span>
            <Input
              type="datetime-local"
              value={filters.dateRange.start?.toISOString().slice(0, 16) || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  start: e.target.value ? new Date(e.target.value) : null
                }
              })}
              className="h-10"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="datetime-local"
              value={filters.dateRange.end?.toISOString().slice(0, 16) || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  end: e.target.value ? new Date(e.target.value) : null
                }
              })}
              className="h-10"
            />
          </div>
        )}
      </div>
    </div>
  );
}