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
  DollarSign,
  AlertCircle,
  Clock,
  Shield,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PenaltyFiltersProps {
  filters: {
    search: string;
    status: string;
    violationType: string;
    dateRange: { start: Date | null; end: Date | null };
    employee: string;
    amountRange: { min: number | null; max: number | null };
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  employees?: Array<{ id: string; name: string }>;
  stats?: {
    active: number;
    waived: number;
    paid: number;
    totalAmount: number;
    activeAmount: number;
  };
}

const statusOptions = [
  { value: "all", label: "All Status", icon: null },
  { value: "active", label: "Active", icon: Clock, color: "text-yellow-600" },
  { value: "waived", label: "Waived", icon: Shield, color: "text-green-600" },
  { value: "paid", label: "Paid", icon: DollarSign, color: "text-gray-600" }
];

const violationTypeOptions = [
  { value: "all", label: "All Violations" },
  { value: "absent", label: "Absent" },
  { value: "half-absent", label: "Half-Absent" },
  { value: "late", label: "Late" },
  { value: "early-leave", label: "Early Leave" }
];

export function PenaltyFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
  employees = [],
  stats
}: PenaltyFiltersProps) {
  const activeFilters = Object.values(filters).filter(v => {
    if (typeof v === "object" && v !== null) {
      return Object.values(v).some(val => val !== null);
    }
    return v && v !== "all" && v !== "";
  }).length;

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => handleQuickFilter("active")}
            className="text-left p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-600">Active</span>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.active}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("waived")}
            className="text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-600">Waived</span>
              <Shield className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.waived}</p>
          </button>

          <button
            onClick={() => handleQuickFilter("paid")}
            className="text-left p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Paid</span>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700 mt-1">{stats.paid}</p>
          </button>

          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-600">Active Amt</span>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-orange-700 mt-1">
              ${stats.activeAmount.toFixed(0)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-600">Total Amt</span>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-700 mt-1">
              ${stats.totalAmount.toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by employee name or notes..."
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

        {/* Violation Type Filter */}
        <Select
          value={filters.violationType}
          onValueChange={(value) => onFiltersChange({ ...filters, violationType: value })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select violation type" />
          </SelectTrigger>
          <SelectContent>
            {violationTypeOptions.map((option) => (
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
                violationType: "all",
                dateRange: { start: null, end: null },
                employee: "all",
                amountRange: { min: null, max: null }
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
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Issue Date:</span>
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

        {/* Amount Range Filter */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Amount:</span>
          <Input
            type="number"
            placeholder="Min"
            value={filters.amountRange.min || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              amountRange: {
                ...filters.amountRange,
                min: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
            className="h-10 w-20"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.amountRange.max || ''}
            onChange={(e) => onFiltersChange({
              ...filters,
              amountRange: {
                ...filters.amountRange,
                max: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
            className="h-10 w-20"
          />
        </div>
      </div>
    </div>
  );
}