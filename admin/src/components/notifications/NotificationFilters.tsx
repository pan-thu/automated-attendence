"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Bell,
  Mail,
  Smartphone,
  MessageSquare
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
  onExport?: () => void;
  onComposeNew?: () => void;
  isLoading?: boolean;
  users?: Array<{ id: string; name: string }>;
  stats?: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    byChannel: {
      inApp: number;
      email: number;
      push: number;
      sms: number;
    };
  };
}

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "info", label: "Information" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "leave", label: "Leave" },
  { value: "penalty", label: "Penalty" },
  { value: "attendance", label: "Attendance" },
  { value: "system", label: "System" }
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" }
];

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

const channelOptions = [
  { value: "all", label: "All Channels" },
  { value: "in-app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
  { value: "sms", label: "SMS" }
];

const targetTypeOptions = [
  { value: "all", label: "All Targets" },
  { value: "all-users", label: "All Users" },
  { value: "specific", label: "Specific Users" },
  { value: "group", label: "Group" },
  { value: "role", label: "By Role" }
];

export function NotificationFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onComposeNew,
  isLoading = false,
  users = [],
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
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
              onClick={() => handleQuickFilter("sent")}
              className="text-left p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600">Sent</span>
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.sent}</p>
            </button>

            <button
              onClick={() => handleQuickFilter("delivered")}
              className="text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">Delivered</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.delivered}</p>
            </button>

            <button
              onClick={() => handleQuickFilter("read")}
              className="text-left p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-600">Read</span>
                <Eye className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats.read}</p>
            </button>

            <button
              onClick={() => handleQuickFilter("failed")}
              className="text-left p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-600">Failed</span>
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700 mt-1">{stats.failed}</p>
            </button>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Total</span>
                <Bell className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700 mt-1">{stats.total}</p>
            </div>
          </div>

          {/* Channel Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
              <Bell className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">In-App</p>
              <p className="text-sm font-bold text-gray-700">{stats.byChannel.inApp}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
              <Mail className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Email</p>
              <p className="text-sm font-bold text-gray-700">{stats.byChannel.email}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
              <Smartphone className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Push</p>
              <p className="text-sm font-bold text-gray-700">{stats.byChannel.push}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 border border-gray-200 text-center">
              <MessageSquare className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">SMS</p>
              <p className="text-sm font-bold text-gray-700">{stats.byChannel.sms}</p>
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
            placeholder="Search by title, message, or sender..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

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

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Channel Filter */}
        <select
          value={filters.channel}
          onChange={(e) => onFiltersChange({ ...filters, channel: e.target.value })}
          className="h-8 px-2 rounded-md border border-input bg-background text-sm"
        >
          {channelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Target Type Filter */}
        <select
          value={filters.targetType}
          onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value })}
          className="h-8 px-2 rounded-md border border-input bg-background text-sm"
        >
          {targetTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Sent By Filter */}
        {users.length > 0 && (
          <select
            value={filters.sentBy}
            onChange={(e) => onFiltersChange({ ...filters, sentBy: e.target.value })}
            className="h-8 px-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Senders</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sent:</span>
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
            className="h-8"
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
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
}