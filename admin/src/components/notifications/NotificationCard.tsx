"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  DollarSign,
  FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "leave" | "penalty" | "attendance" | "system";
  priority: "low" | "medium" | "high" | "urgent";
  status: "sent" | "read";
  targetType: "all" | "specific" | "group" | "role";
  targetUsers?: string[];
  targetUserNames?: string[];
  targetRoles?: string[];
  targetGroups?: string[];
  sentBy: string;
  sentByName: string;
  sentByEmail: string;
  sentAt: Date;
  readAt?: Date;
  channel: "in-app";
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  recipientCount?: number;
  readCount?: number;
}

interface NotificationCardProps {
  notification: Notification;
  onViewDetails?: (notification: Notification) => void;
  onViewRecipients?: (notification: Notification) => void;
  isProcessing?: boolean;
}

const typeConfig = {
  info: { label: "Information", color: "bg-blue-100 text-blue-700", icon: Info },
  success: { label: "Success", color: "bg-green-100 text-green-700", icon: CheckCircle },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  error: { label: "Error", color: "bg-red-100 text-red-700", icon: XCircle },
  leave: { label: "Leave", color: "bg-purple-100 text-purple-700", icon: FileText },
  penalty: { label: "Penalty", color: "bg-orange-100 text-orange-700", icon: DollarSign },
  attendance: { label: "Attendance", color: "bg-indigo-100 text-indigo-700", icon: Calendar },
  system: { label: "System", color: "bg-gray-100 text-gray-700", icon: Shield }
};

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-600" }
};

const statusConfig = {
  sent: { label: "Unread", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send },
  read: { label: "Read", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Eye }
};

const targetIcons = {
  all: Globe,
  specific: User,
  group: Globe,
  role: Shield
};

export function NotificationCard({
  notification,
  onViewDetails,
  onViewRecipients,
  isProcessing = false
}: NotificationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const typeInfo = typeConfig[notification.type];
  const priorityInfo = priorityConfig[notification.priority];
  const statusInfo = statusConfig[notification.status];
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo.icon;
  const TargetIcon = targetIcons[notification.targetType];

  return (
    <div className={cn(
      "border rounded-lg transition-all hover:bg-muted/50",
      notification.priority === "urgent" && "border-red-400 border-2",
      notification.status === "read" && "bg-muted/20"
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-4 p-4">
        {/* Type Icon */}
        <div className={cn(
          "p-2 rounded-lg flex-shrink-0",
          typeInfo.color.replace("text-", "bg-").replace("-700", "-100")
        )}>
          <TypeIcon className="h-4 w-4" />
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1">{notification.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {notification.message}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TargetIcon className="h-3 w-3" />
                  <span className="capitalize">{notification.targetType}</span>
                  {notification.recipientCount && (
                    <span>({notification.recipientCount} recipients)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Badges and Time */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Sent by {notification.sentByName}</span>
              </div>
              <Badge variant="outline" className={cn("text-xs", priorityInfo.color)}>
                {priorityInfo.label} Priority
              </Badge>
              <Badge variant="outline" className={cn("gap-1", statusInfo.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(notification.sentAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="space-y-3">
            {/* Delivery Stats */}
            {notification.recipientCount && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-background rounded border">
                  <p className="text-2xl font-bold text-blue-600">
                    {notification.recipientCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Recipients</p>
                </div>
                <div className="text-center p-2 bg-background rounded border">
                  <p className="text-2xl font-bold text-purple-600">
                    {notification.status === "read" ? "100" : "0"}%
                  </p>
                  <p className="text-xs text-muted-foreground">Read</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium mb-1">Sent At</p>
                <p className="text-muted-foreground">
                  {format(notification.sentAt, "MMM dd, yyyy hh:mm a")}
                </p>
              </div>
              {notification.readAt && (
                <div>
                  <p className="font-medium mb-1">Read At</p>
                  <p className="text-muted-foreground">
                    {format(notification.readAt, "MMM dd, yyyy hh:mm a")}
                  </p>
                </div>
              )}
            </div>

            {/* Target Details */}
            {notification.targetType === "specific" && notification.targetUserNames && (
              <div>
                <p className="text-xs font-medium mb-2">Recipients</p>
                <div className="flex flex-wrap gap-1">
                  {notification.targetUserNames.slice(0, 5).map((name, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {notification.targetUserNames.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{notification.targetUserNames.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action URL */}
            {notification.actionUrl && (
              <div className="p-2 bg-blue-50 rounded flex items-center justify-between">
                <span className="text-xs text-blue-700">
                  Action: {notification.actionLabel || "View"}
                </span>
                <code className="text-xs font-mono text-blue-600">
                  {notification.actionUrl}
                </code>
              </div>
            )}

            {/* Actions */}
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(notification)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}