"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useNotifications } from "@/hooks/useNotifications";
import { useEmployees } from "@/hooks/useEmployees";
import { callSendBulkNotification } from "@/lib/firebase/functions";

// Import new components
import { NotificationListTable } from "@/components/notifications/NotificationListTable";
import { NotificationFilters } from "@/components/notifications/NotificationFilters";
import { NotificationComposer } from "@/components/notifications/NotificationComposer";
import { NotificationListSkeleton } from "@/components/notifications/NotificationListSkeleton";
import { format } from "date-fns";

export default function NotificationsPage() {
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    status: "all",
    priority: "all",
    channel: "all",
    targetType: "all",
    sentBy: "",
    dateRange: { start: null as Date | null, end: null as Date | null }
  });

  const { records, loading, error, refresh } = useNotifications();
  const { employees } = useEmployees();

  // Transform and filter notifications
  const transformedNotifications = useMemo(() => {
    if (!records) return [];

    return records
      .filter((notification) => {
        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!notification.title?.toLowerCase().includes(searchLower) &&
              !notification.message?.toLowerCase().includes(searchLower) &&
              !notification.userName?.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        const notifType = notification.type || "info";
        if (filters.type !== "all" && notifType !== filters.type) {
          return false;
        }

        const notifStatus = notification.isRead ? "read" : "sent";
        if (filters.status !== "all" && notifStatus !== filters.status) {
          return false;
        }

        if (filters.priority !== "all") {
          // Infer priority based on type
          const priority = notifType === "error" ? "high" :
                          notifType === "warning" ? "medium" : "low";
          if (priority !== filters.priority) {
            return false;
          }
        }

        if (filters.dateRange.start && notification.sentAt && notification.sentAt < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end && notification.sentAt && notification.sentAt > filters.dateRange.end) {
          return false;
        }

        return true;
      })
      .map((notification) => {
        const employee = employees.find(e => e.id === notification.userId);

        // Determine notification type based on category
        let type: any = "info";
        if (notification.type) {
          type = notification.type;
        } else if (notification.category === "penalty") {
          type = "penalty";
        } else if (notification.category === "leave") {
          type = "leave";
        } else if (notification.category === "attendance") {
          type = "attendance";
        } else if (notification.category === "system") {
          type = "system";
        }

        // Infer priority
        let priority: any = "medium";
        if (notification.type === "error") priority = "high";
        else if (notification.type === "warning") priority = "high";
        else if (notification.type === "success") priority = "low";

        // Determine status - simplified to just sent/read
        let status: any = notification.isRead ? "read" : "sent";

        return {
          id: notification.id,
          title: notification.title || "Notification",
          message: notification.message || "",
          type,
          priority,
          status,
          targetType: notification.userId ? "specific" : "all" as any,
          targetUsers: notification.userId ? [notification.userId] : undefined,
          targetUserNames: employee ? [employee.fullName] : notification.userName ? [notification.userName] : undefined,
          targetRoles: undefined,
          targetGroups: undefined,
          sentBy: (notification as any).sentBy || "System",
          sentByName: (notification as any).sentByName || "System",
          sentByEmail: (notification as any).sentByEmail || "",
          sentAt: notification.sentAt || new Date(),
          deliveredAt: (notification as any).deliveredAt,
          readAt: (notification as any).readAt,
          failedAt: undefined,
          failureReason: undefined,
          channel: "in-app" as any,
          channels: ["in-app"],
          metadata: notification.metadata || undefined,
          actionUrl: (notification as any).actionUrl,
          actionLabel: (notification as any).actionLabel,
          recipientCount: 1,
          deliveredCount: (notification as any).deliveredAt ? 1 : 0,
          readCount: notification.isRead ? 1 : 0,
          failedCount: 0
        };
      })
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }, [records, employees, filters]);

  // Separate notifications by status - simplified to sent/read only
  const sentNotifications = transformedNotifications.filter(n => n.status === "sent");
  const readNotifications = transformedNotifications.filter(n => n.status === "read");

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: transformedNotifications.length,
      sent: sentNotifications.length,
      read: readNotifications.length
    };
  }, [transformedNotifications, sentNotifications, readNotifications]);

  const handleSendNotification = async (notification: any) => {
    if (notification.targetType === "all") {
      // Get all employee IDs
      const allEmployeeIds = employees.map(e => e.id);
      await callSendBulkNotification({
        userIds: allEmployeeIds,
        title: notification.title,
        message: notification.message,
        category: notification.type,
        type: notification.priority
      });
    } else if (notification.targetType === "specific") {
      await callSendBulkNotification({
        userIds: notification.targetUsers,
        title: notification.title,
        message: notification.message,
        category: notification.type,
        type: notification.priority
      });
    }

    await refresh();
  };

  const handleViewDetails = (notification: any) => {
    setDetailsDialog(notification);
  };

  const getNotificationsByTab = () => {
    switch (activeTab) {
      case "sent":
        return sentNotifications;
      case "read":
        return readNotifications;
      default:
        return transformedNotifications;
    }
  };


  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Filters */}
          <NotificationFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refresh}
            onComposeNew={() => setComposeOpen(true)}
            isLoading={loading}
            stats={stats}
          />

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-[400px] grid-cols-3">
              <TabsTrigger value="all">
                All ({transformedNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Unread ({sentNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <NotificationListSkeleton count={8} />
              ) : (
                <NotificationListTable
                  notifications={getNotificationsByTab()}
                  onViewDetails={handleViewDetails}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Notification Composer */}
          <NotificationComposer
            open={composeOpen}
            onClose={() => setComposeOpen(false)}
            onSend={handleSendNotification}
            employees={employees.map(e => ({
              id: e.id,
              name: e.fullName,
              email: e.email,
              department: e.department || undefined
            }))}
          />

          {/* Details Dialog */}
          <Dialog open={!!detailsDialog} onOpenChange={(open) => !open && setDetailsDialog(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Notification Details</DialogTitle>
                <DialogDescription>
                  Complete information about the notification
                </DialogDescription>
              </DialogHeader>
              {detailsDialog && (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Title</p>
                      <p className="text-sm text-muted-foreground">{detailsDialog.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Type</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Priority</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.priority}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Status</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.status}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Channel</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.channel}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Target</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {detailsDialog.targetType}
                        {detailsDialog.recipientCount && (
                          <span> ({detailsDialog.recipientCount} recipients)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <p className="text-sm font-medium mb-1">Message</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailsDialog.message}
                    </p>
                  </div>

                  {/* Sender Info */}
                  <div>
                    <p className="text-sm font-medium mb-1">Sent By</p>
                    <p className="text-sm text-muted-foreground">
                      {detailsDialog.sentByName}
                      {detailsDialog.sentByEmail && (
                        <span className="text-xs ml-2">({detailsDialog.sentByEmail})</span>
                      )}
                    </p>
                  </div>

                  {/* Timestamps */}
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Sent At</p>
                      <p className="text-sm text-muted-foreground">
                        {format(detailsDialog.sentAt, "MMM dd, yyyy hh:mm a")}
                      </p>
                    </div>
                    {detailsDialog.deliveredAt && (
                      <div>
                        <p className="text-sm font-medium mb-1">Delivered At</p>
                        <p className="text-sm text-muted-foreground">
                          {format(detailsDialog.deliveredAt, "MMM dd, yyyy hh:mm a")}
                        </p>
                      </div>
                    )}
                    {detailsDialog.readAt && (
                      <div>
                        <p className="text-sm font-medium mb-1">Read At</p>
                        <p className="text-sm text-muted-foreground">
                          {format(detailsDialog.readAt, "MMM dd, yyyy hh:mm a")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action URL */}
                  {detailsDialog.actionUrl && (
                    <div>
                      <p className="text-sm font-medium mb-1">Action</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {detailsDialog.actionUrl}
                        </code>
                        {detailsDialog.actionLabel && (
                          <span className="text-sm text-muted-foreground">
                            ({detailsDialog.actionLabel})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {detailsDialog.metadata && Object.keys(detailsDialog.metadata).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Metadata</p>
                      <div className="p-3 bg-muted/50 rounded">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(detailsDialog.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialog(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}