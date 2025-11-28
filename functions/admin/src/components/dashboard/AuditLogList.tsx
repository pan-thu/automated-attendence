"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, User, AlertCircle } from "lucide-react";
import type { AuditLog } from "@/hooks/useAuditLogs";

interface AuditLogListProps {
  logs: AuditLog[];
  loading?: boolean;
}

const actionConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  // Employee actions
  create_employee: { label: "Created Employee", color: "bg-blue-500", icon: User },
  update_employee: { label: "Updated Employee", color: "bg-yellow-500", icon: User },
  delete_employee: { label: "Deleted Employee", color: "bg-red-500", icon: User },
  // Leave actions
  approve_leave: { label: "Approved Leave", color: "bg-green-500", icon: FileText },
  reject_leave: { label: "Rejected Leave", color: "bg-red-500", icon: FileText },
  leave_approve: { label: "Approved Leave", color: "bg-green-500", icon: FileText },
  leave_reject: { label: "Rejected Leave", color: "bg-red-500", icon: FileText },
  submit_leave: { label: "Submitted Leave", color: "bg-blue-500", icon: FileText },
  // Penalty actions
  waive_penalty: { label: "Waived Penalty", color: "bg-purple-500", icon: Shield },
  calculate_daily_violations: { label: "Calculated Penalties", color: "bg-orange-500", icon: Shield },
  // Attendance actions
  manual_attendance: { label: "Manual Attendance", color: "bg-orange-500", icon: FileText },
  clock_in: { label: "Clock In", color: "bg-green-500", icon: FileText },
  clock_out: { label: "Clock Out", color: "bg-blue-500", icon: FileText },
  // Settings actions
  update_settings: { label: "Updated Settings", color: "bg-indigo-500", icon: Shield },
  update_company_settings: { label: "Updated Settings", color: "bg-indigo-500", icon: Shield },
  // Notification actions
  send_notification: { label: "Sent Notification", color: "bg-cyan-500", icon: AlertCircle },
  // Profile actions
  update_own_profile: { label: "Updated Profile", color: "bg-yellow-500", icon: User },
  update_profile: { label: "Updated Profile", color: "bg-yellow-500", icon: User },
  register_profile_photo: { label: "Uploaded Photo", color: "bg-blue-500", icon: User },
  generate_profile_photo_upload_url: { label: "Photo Upload", color: "bg-gray-500", icon: User },
  // Notification list actions
  list_employee_notifications: { label: "Viewed Notifications", color: "bg-gray-400", icon: AlertCircle },
  mark_notification_read: { label: "Read Notification", color: "bg-gray-400", icon: AlertCircle },
  // Auth actions
  login: { label: "Logged In", color: "bg-green-500", icon: User },
  logout: { label: "Logged Out", color: "bg-gray-500", icon: User },
};

const getActionConfig = (action: string) => {
  const normalized = action.toLowerCase().replace(/ /g, "_");
  return actionConfig[normalized] || { label: formatActionLabel(action), color: "bg-gray-500", icon: FileText };
};

// Format action string into readable label
const formatActionLabel = (action: string): string => {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export function AuditLogList({ logs, loading = false }: AuditLogListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Recent Audit Logs
        </CardTitle>
        <CardDescription>
          Track all administrative actions and system changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No audit logs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Administrative actions will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = getActionConfig(log.action);
                  const Icon = config.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.performedByName || "Unknown Admin"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.performedBy}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.targetUserName ? (
                          <div className="flex flex-col">
                            <span>{log.targetUserName}</span>
                            <span className="text-xs text-muted-foreground">
                              {log.targetUserId}
                            </span>
                          </div>
                        ) : log.resource ? (
                          <div className="flex flex-col">
                            <span className="text-sm">{log.resource}</span>
                            {log.resourceId && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.resourceId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(log.timestamp, "MMM dd, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(log.timestamp, "h:mm a")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(log.details)
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {String(value).substring(0, 20)}
                                  {String(value).length > 20 ? "..." : ""}
                                </Badge>
                              ))}
                            {Object.keys(log.details).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.keys(log.details).length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
