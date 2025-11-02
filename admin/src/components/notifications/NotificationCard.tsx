"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  BellOff,
  Calendar,
  Clock,
  User,
  Users,
  Mail,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Target,
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
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  targetType: "all" | "specific" | "group" | "role";
  targetUsers?: string[];
  targetUserNames?: string[];
  targetRoles?: string[];
  targetGroups?: string[];
  sentBy: string;
  sentByName: string;
  sentByEmail: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  channel: "in-app" | "email" | "push" | "sms" | "multiple";
  channels?: string[];
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  recipientCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
}

interface NotificationCardProps {
  notification: Notification;
  onResend?: (id: string) => void;
  onCancel?: (id: string) => void;
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
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  read: { label: "Read", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Eye },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle }
};

const channelIcons = {
  "in-app": Bell,
  email: Mail,
  push: Smartphone,
  sms: MessageSquare,
  multiple: Globe
};

const targetIcons = {
  all: Globe,
  specific: User,
  group: Users,
  role: Shield
};

export function NotificationCard({
  notification,
  onResend,
  onCancel,
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
  const ChannelIcon = channelIcons[notification.channel];
  const TargetIcon = targetIcons[notification.targetType];

  const deliveryRate = notification.recipientCount
    ? Math.round((notification.deliveredCount || 0) / notification.recipientCount * 100)
    : 0;

  const readRate = notification.deliveredCount
    ? Math.round((notification.readCount || 0) / notification.deliveredCount * 100)
    : 0;

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      notification.priority === "urgent" && "border-red-400 border-2",
      notification.status === "failed" && "border-red-300"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Notification Info */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              typeInfo.color.replace("text-", "bg-").replace("-700", "-100")
            )}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm">{notification.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TargetIcon className="h-3 w-3" />
                  <span className="capitalize">{notification.targetType}</span>
                  {notification.recipientCount && (
                    <span>({notification.recipientCount} recipients)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <ChannelIcon className="h-3 w-3" />
                  <span className="capitalize">{notification.channel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={cn("text-xs", priorityInfo.color)}>
              {priorityInfo.label} Priority
            </Badge>
            <Badge variant="outline" className={cn("gap-1", statusInfo.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sender and Time Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>Sent by {notification.sentByName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(notification.sentAt, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Delivery Stats */}
        {notification.status !== "pending" && notification.recipientCount && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-2xl font-bold text-blue-600">
                {notification.recipientCount}
              </p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-2xl font-bold text-green-600">
                {deliveryRate}%
              </p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-2xl font-bold text-purple-600">
                {readRate}%
              </p>
              <p className="text-xs text-muted-foreground">Read</p>
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

        {/* Failure Reason */}
        {notification.status === "failed" && notification.failureReason && (
          <div className="p-2 bg-red-50 rounded">
            <p className="text-xs font-medium text-red-900 mb-1">Failure Reason</p>
            <p className="text-xs text-red-700">{notification.failureReason}</p>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Details
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium mb-1">Sent At</p>
                <p className="text-muted-foreground">
                  {format(notification.sentAt, "MMM dd, yyyy hh:mm a")}
                </p>
              </div>
              {notification.deliveredAt && (
                <div>
                  <p className="font-medium mb-1">Delivered At</p>
                  <p className="text-muted-foreground">
                    {format(notification.deliveredAt, "MMM dd, yyyy hh:mm a")}
                  </p>
                </div>
              )}
              {notification.readAt && (
                <div>
                  <p className="font-medium mb-1">First Read At</p>
                  <p className="text-muted-foreground">
                    {format(notification.readAt, "MMM dd, yyyy hh:mm a")}
                  </p>
                </div>
              )}
              {notification.failedAt && (
                <div>
                  <p className="font-medium mb-1">Failed At</p>
                  <p className="text-muted-foreground">
                    {format(notification.failedAt, "MMM dd, yyyy hh:mm a")}
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

            {/* Channels Used */}
            {notification.channels && notification.channels.length > 1 && (
              <div>
                <p className="text-xs font-medium mb-2">Channels Used</p>
                <div className="flex gap-2">
                  {notification.channels.map((channel) => {
                    const Icon = channelIcons[channel as keyof typeof channelIcons];
                    return Icon ? (
                      <div key={channel} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                        <Icon className="h-3 w-3" />
                        <span className="capitalize">{channel}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Additional Data</p>
                <div className="space-y-1">
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                      <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {onViewRecipients && notification.recipientCount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewRecipients(notification)}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Recipients
                </Button>
              )}
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(notification)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              )}
              {onResend && notification.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResend(notification.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend
                </Button>
              )}
              {onCancel && notification.status === "pending" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(notification.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}