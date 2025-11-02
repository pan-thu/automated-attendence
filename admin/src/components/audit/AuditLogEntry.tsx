"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Calendar,
  Clock,
  Activity,
  Shield,
  Database,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  UserX,
  Edit,
  Trash,
  Settings,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Key,
  Mail,
  Smartphone
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "admin" | "employee" | "system";
  action: string;
  category: "user" | "attendance" | "leave" | "penalty" | "settings" | "system" | "authentication";
  severity: "info" | "warning" | "error" | "critical";
  targetType?: string;
  targetId?: string;
  targetName?: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  description: string;
}

interface AuditLogEntryCardProps {
  entry: AuditLogEntry;
  onViewDetails?: (entry: AuditLogEntry) => void;
}

const actionIcons: Record<string, any> = {
  create: UserCheck,
  update: Edit,
  delete: Trash,
  waive: Shield,
  approve: CheckCircle,
  reject: XCircle,
  login: Key,
  logout: Key,
  settings: Settings,
  export: FileText,
  email: Mail,
  notification: Smartphone,
  default: Activity
};

const categoryConfig = {
  user: { label: "User Management", color: "bg-blue-100 text-blue-700", icon: User },
  attendance: { label: "Attendance", color: "bg-green-100 text-green-700", icon: Calendar },
  leave: { label: "Leave", color: "bg-yellow-100 text-yellow-700", icon: FileText },
  penalty: { label: "Penalty", color: "bg-red-100 text-red-700", icon: DollarSign },
  settings: { label: "Settings", color: "bg-purple-100 text-purple-700", icon: Settings },
  system: { label: "System", color: "bg-gray-100 text-gray-700", icon: Database },
  authentication: { label: "Authentication", color: "bg-indigo-100 text-indigo-700", icon: Shield }
};

const severityConfig = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle },
  error: { label: "Error", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  critical: { label: "Critical", color: "bg-red-200 text-red-900 border-red-400", icon: XCircle }
};

export function AuditLogEntryCard({ entry, onViewDetails }: AuditLogEntryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const categoryInfo = categoryConfig[entry.category];
  const severityInfo = severityConfig[entry.severity];
  const CategoryIcon = categoryInfo.icon;
  const SeverityIcon = severityInfo.icon;

  // Get action icon
  const actionKey = entry.action.toLowerCase();
  const ActionIcon = Object.keys(actionIcons).find(key => actionKey.includes(key))
    ? actionIcons[Object.keys(actionIcons).find(key => actionKey.includes(key))!]
    : actionIcons.default;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value instanceof Date) return format(value, "MMM dd, yyyy hh:mm a");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      entry.severity === "critical" && "border-red-400 border-2",
      entry.severity === "error" && "border-red-300"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                categoryInfo.color.replace("text-", "bg-").replace("-700", "-100")
              )}>
                <CategoryIcon className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{entry.action}</p>
                  <Badge variant="outline" className={cn("text-xs", severityInfo.color)}>
                    <SeverityIcon className="h-3 w-3 mr-1" />
                    {severityInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
                {entry.targetName && (
                  <p className="text-xs text-muted-foreground">
                    Target: <span className="font-medium">{entry.targetName}</span>
                    {entry.targetType && <span> ({entry.targetType})</span>}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className={cn("text-xs", categoryInfo.color)}>
              {categoryInfo.label}
            </Badge>
          </div>

          {/* User and Time Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="font-medium">{entry.userName}</span>
                <Badge variant="outline" className="text-xs ml-1">
                  {entry.userRole}
                </Badge>
              </div>
              {entry.ipAddress && (
                <span className="text-xs">IP: {entry.ipAddress}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(entry.timestamp, "MMM dd, yyyy hh:mm:ss a")}</span>
            </div>
          </div>

          {/* Changes Preview */}
          {entry.changes && entry.changes.length > 0 && !expanded && (
            <div className="flex flex-wrap gap-2">
              {entry.changes.slice(0, 2).map((change, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {change.field}: {formatValue(change.oldValue)} → {formatValue(change.newValue)}
                </Badge>
              ))}
              {entry.changes.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{entry.changes.length - 2} more changes
                </Badge>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          {(entry.changes || entry.metadata) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          )}

          {/* Expanded Details */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t">
              {/* All Changes */}
              {entry.changes && entry.changes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Changes Made</p>
                  <div className="space-y-1">
                    {entry.changes.map((change, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium">{change.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatValue(change.oldValue)}</span>
                          <span>→</span>
                          <span className="font-medium">{formatValue(change.newValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Additional Information</p>
                  <div className="space-y-1">
                    {Object.entries(entry.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Log ID:</span>
                  <code className="font-mono">{entry.id}</code>
                </div>
                {entry.targetId && (
                  <div className="flex items-center justify-between">
                    <span>Target ID:</span>
                    <code className="font-mono">{entry.targetId}</code>
                  </div>
                )}
                {entry.userAgent && (
                  <div className="flex items-center justify-between">
                    <span>User Agent:</span>
                    <span className="text-right ml-2 truncate">{entry.userAgent}</span>
                  </div>
                )}
              </div>

              {/* View Full Details Button */}
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => onViewDetails(entry)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Full Details
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}