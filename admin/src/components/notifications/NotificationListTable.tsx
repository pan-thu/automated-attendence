"use client";

import { formatDistanceToNow } from "date-fns";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  sentBy: string;
  sentByName: string;
  sentByEmail: string;
  sentAt: Date;
  readAt?: Date;
  recipientCount?: number;
  metadata?: Record<string, any>;
}

interface NotificationListTableProps {
  notifications: Notification[];
  onViewDetails?: (notification: Notification) => void;
}

const typeConfig = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700" },
  success: { label: "Success", color: "bg-green-100 text-green-700" },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-700" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
  leave: { label: "Leave", color: "bg-purple-100 text-purple-700" },
  penalty: { label: "Penalty", color: "bg-orange-100 text-orange-700" },
  attendance: { label: "Attendance", color: "bg-indigo-100 text-indigo-700" },
  system: { label: "System", color: "bg-gray-100 text-gray-700" }
};

const statusConfig = {
  sent: { label: "Unread", color: "bg-blue-100 text-blue-700" },
  read: { label: "Read", color: "bg-gray-100 text-gray-700" }
};

export function NotificationListTable({
  notifications,
  onViewDetails
}: NotificationListTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No notifications found
              </TableCell>
            </TableRow>
          ) : (
            notifications.map((notification) => {
              const typeInfo = typeConfig[notification.type];
              const statusInfo = statusConfig[notification.status];
              const recipientName = notification.targetUserNames?.[0] || "Unknown";

              return (
                <TableRow
                  key={notification.id}
                  className={cn(notification.status === "read" && "bg-muted/20")}
                >
                  <TableCell className="font-medium">{notification.title}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {notification.message}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", typeInfo.color)}>
                      {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{recipientName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(notification.sentAt, { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(notification)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
