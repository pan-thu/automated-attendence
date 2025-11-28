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
  CheckCircle,
  Clock,
  XCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveFiltersProps {
  filters: {
    search: string;
    status: string;
    leaveType: string;
    dateRange: { start: Date | null; end: Date | null };
    employee: string;
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  employees?: Array<{ id: string; name: string }>;
  stats?: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

const statusOptions = [
  { value: "all", label: "All Status", icon: null },
  { value: "pending", label: "Pending", icon: Clock, color: "text-yellow-600" },
  { value: "approved", label: "Approved", icon: CheckCircle, color: "text-green-600" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "text-gray-600" }
];

const leaveTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "full", label: "Full Leave" },
  { value: "medical", label: "Medical Leave" },
  { value: "maternity", label: "Maternity Leave" }
];

export function LeaveFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
  employees = [],
  stats
}: LeaveFiltersProps) {
  const activeFilters = Object.values(filters).filter(
    v => v && v !== "all" && v !== ""
  ).length;

  const handleQuickFilter = (status: string) => {
    onFiltersChange({
      ...filters,
      status
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleQuickFilter("pending")}
            className="text-left p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-600">Pending</span>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("approved")}
            className="text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Approved</span>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.approved}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("rejected")}
            className="text-left p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600">Rejected</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.rejected}</p>
          </button>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Total</span>
              <FileText className="h-4 w-4 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700 mt-1">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by employee name or reason..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Leave Type Filter */}
        <Select
          value={filters.leaveType}
          onValueChange={(value) => onFiltersChange({ ...filters, leaveType: value })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Employee Filter */}
        {employees.length > 0 && (
          <Select
            value={filters.employee}
            onValueChange={(value) => onFiltersChange({ ...filters, employee: value })}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
                status: "all",
                leaveType: "all",
                dateRange: { start: null, end: null },
                employee: "all"
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

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Date Range:</span>
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
          className="h-10"
        />
        <span className="text-sm text-muted-foreground">to</span>
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
          className="h-10"
        />
      </div>
    </div>
  );
}