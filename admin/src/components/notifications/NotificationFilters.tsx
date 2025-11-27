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
  RefreshCw,
  Send,
  Eye,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationFiltersProps {
  filters: {
    search: string;
    type: string;
    status: string;
    priority: string;
    channel: string;
    targetType: string;
    sentBy: string;
    dateRange: { start: Date | null; end: Date | null };
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  onComposeNew?: () => void;
  isLoading?: boolean;
  stats?: {
    total: number;
    sent: number;
    read: number;
  };
}

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "leave", label: "Leave" },
  { value: "penalty", label: "Penalty" },
  { value: "attendance", label: "Attendance" },
  { value: "system", label: "System" }
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "sent", label: "Unread" },
  { value: "read", label: "Read" }
];

export function NotificationFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onComposeNew,
  isLoading = false,
  stats
}: NotificationFiltersProps) {
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
        <div>
          {/* Status Stats */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <button
              onClick={() => handleQuickFilter("sent")}
              className="text-left p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600">Unread</span>
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.sent}</p>
            </button>

            <button
              onClick={() => handleQuickFilter("read")}
              className="text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Read</span>
                <Eye className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.read}</p>
            </button>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Total</span>
                <Bell className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700 mt-1">{stats.total}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by title or message..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        <Select
          value={filters.type}
          onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-[180px]">
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

        {/* Actions */}
        <div className="flex gap-2">
          {onComposeNew && (
            <Button onClick={onComposeNew}>
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({
                search: "",
                type: "all",
                status: "all",
                priority: "all",
                channel: "all",
                targetType: "all",
                sentBy: "",
                dateRange: { start: null, end: null }
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
    </div>
  );
}