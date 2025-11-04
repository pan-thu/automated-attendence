"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useEmployees } from "@/hooks/useEmployees";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Import new components
import { AuditLogFilters } from "@/components/audit/AuditLogFilters";
import { AuditLogTableSkeleton } from "@/components/audit/AuditLogTableSkeleton";
import { Database, Shield, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const [detailsDialog, setDetailsDialog] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    severity: "all",
    action: "all",
    user: "all",
    dateRange: { start: null as Date | null, end: null as Date | null },
    timeRange: "today"
  });

  const { records, loading, error, refresh } = useAuditLogs({ maxRecords: 100 });
  const { employees } = useEmployees();

  // Transform and filter audit logs
  const transformedLogs = useMemo(() => {
    if (!records) return [];

    return records
      .filter((log) => {
        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!log.action?.toLowerCase().includes(searchLower) &&
              !log.performedByEmail?.toLowerCase().includes(searchLower) &&
              !log.resource?.toLowerCase().includes(searchLower) &&
              !log.resourceId?.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Map resource to category
        let category = "system";
        if (log.resource?.includes("USERS")) category = "user";
        else if (log.resource?.includes("ATTENDANCE")) category = "attendance";
        else if (log.resource?.includes("LEAVE")) category = "leave";
        else if (log.resource?.includes("PENALT")) category = "penalty";
        else if (log.resource?.includes("SETTINGS")) category = "settings";
        else if (log.resource?.includes("AUTH")) category = "authentication";

        if (filters.category !== "all" && category !== filters.category) {
          return false;
        }

        // Map status to severity
        let severity = "info";
        if (log.status === "error" || log.status === "failure") severity = "error";
        else if (log.errorMessage) severity = "warning";

        if (filters.severity !== "all" && severity !== filters.severity) {
          return false;
        }

        if (filters.action !== "all" && !log.action?.toLowerCase().includes(filters.action.toLowerCase())) {
          return false;
        }

        if (filters.user && filters.user !== "all" && log.performedBy !== filters.user) {
          return false;
        }

        if (filters.dateRange.start && log.timestamp && log.timestamp < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end && log.timestamp && log.timestamp > filters.dateRange.end) {
          return false;
        }

        return true;
      })
      .map((log) => {
        const employee = employees.find(e => e.id === log.performedBy);

        // Determine category
        let category: any = "system";
        if (log.resource?.includes("USERS")) category = "user";
        else if (log.resource?.includes("ATTENDANCE")) category = "attendance";
        else if (log.resource?.includes("LEAVE")) category = "leave";
        else if (log.resource?.includes("PENALT")) category = "penalty";
        else if (log.resource?.includes("SETTINGS")) category = "settings";
        else if (log.action?.toLowerCase().includes("login") || log.action?.toLowerCase().includes("logout")) {
          category = "authentication";
        }

        // Determine severity
        let severity: any = "info";
        if (log.status === "error" || log.status === "failure") severity = "error";
        else if (log.errorMessage) severity = "warning";
        else if (log.action?.toLowerCase().includes("delete")) severity = "warning";

        // Parse changes from old/new values
        let changes: any[] = [];
        if (log.oldValues && log.newValues) {
          const oldObj = typeof log.oldValues === 'object' ? log.oldValues : {};
          const newObj = typeof log.newValues === 'object' ? log.newValues : {};
          const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

          allKeys.forEach(key => {
            if (oldObj[key] !== newObj[key]) {
              changes.push({
                field: key,
                oldValue: oldObj[key],
                newValue: newObj[key]
              });
            }
          });
        }

        return {
          id: log.id,
          timestamp: log.timestamp || new Date(),
          userId: log.performedBy || "",
          userName: employee?.fullName || log.performedBy || "System",
          userEmail: log.performedByEmail || employee?.email || "",
          userRole: employee ? "admin" : "system" as any,
          action: log.action || "Unknown Action",
          category,
          severity,
          targetType: log.resource,
          targetId: log.resourceId,
          targetName: log.resourceId,
          changes: changes.length > 0 ? changes : undefined,
          metadata: log.metadata || undefined,
          ipAddress: (typeof log.metadata?.ipAddress === 'string' ? log.metadata.ipAddress : undefined) as string | undefined,
          userAgent: (typeof log.metadata?.userAgent === 'string' ? log.metadata.userAgent : undefined) as string | undefined,
          description: `${log.action} on ${log.resource}${log.resourceId ? ` (${log.resourceId})` : ""}`
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [records, employees, filters]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = transformedLogs.filter(log => log.timestamp >= today);
    const criticalLogs = transformedLogs.filter(log => log.severity === "critical");
    const errorLogs = transformedLogs.filter(log => log.severity === "error");
    const warningLogs = transformedLogs.filter(log => log.severity === "warning");

    const byCategory: Record<string, number> = {};
    transformedLogs.forEach(log => {
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      total: transformedLogs.length,
      today: todayLogs.length,
      critical: criticalLogs.length,
      errors: errorLogs.length,
      warnings: warningLogs.length,
      byCategory
    };
  }, [transformedLogs]);

  const handleExport = () => {
    console.log("Exporting audit logs");
  };

  const handleViewDetails = (entry: any) => {
    setDetailsDialog(entry);
  };

  // Get unique users for filter
  const users = useMemo(() => {
    const uniqueUsers = new Map<string, { id: string; name: string; role: string }>();

    transformedLogs.forEach(log => {
      if (log.userId && !uniqueUsers.has(log.userId)) {
        uniqueUsers.set(log.userId, {
          id: log.userId,
          name: log.userName,
          role: log.userRole
        });
      }
    });

    return Array.from(uniqueUsers.values());
  }, [transformedLogs]);

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Filters */}
          <AuditLogFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refresh}
            onExport={handleExport}
            isLoading={loading}
            users={users}
            stats={stats}
          />

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Audit Logs Table */}
          {loading ? (
            <AuditLogTableSkeleton rows={15} />
          ) : transformedLogs.length === 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="h-64">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Database className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-900">No audit logs found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Adjust your filters or time range to see more logs
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transformedLogs.map((log) => {
                    const getSeverityColor = (severity: string) => {
                      switch (severity) {
                        case "critical":
                          return "bg-red-100 text-red-800 border-red-200";
                        case "error":
                          return "bg-red-50 text-red-700 border-red-100";
                        case "warning":
                          return "bg-yellow-50 text-yellow-700 border-yellow-100";
                        default:
                          return "bg-blue-50 text-blue-700 border-blue-100";
                      }
                    };

                    const getCategoryColor = (category: string) => {
                      switch (category) {
                        case "user":
                          return "bg-purple-50 text-purple-700 border-purple-100";
                        case "attendance":
                          return "bg-green-50 text-green-700 border-green-100";
                        case "leave":
                          return "bg-orange-50 text-orange-700 border-orange-100";
                        case "penalty":
                          return "bg-red-50 text-red-700 border-red-100";
                        case "settings":
                          return "bg-gray-50 text-gray-700 border-gray-100";
                        case "authentication":
                          return "bg-indigo-50 text-indigo-700 border-indigo-100";
                        default:
                          return "bg-slate-50 text-slate-700 border-slate-100";
                      }
                    };

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
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
                          <span className="text-sm">{log.action}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(log.category)}>
                            {log.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.userName}</span>
                            <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {log.targetType && (
                              <span className="text-sm">{log.targetType}</span>
                            )}
                            {log.targetId && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.targetId}
                              </span>
                            )}
                            {!log.targetType && !log.targetId && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                }
              </TableBody>
            </Table>
          </div>
          )}

          {/* Pagination Info */}
          {transformedLogs.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Showing {transformedLogs.length} audit log entries</p>
              <p className="text-xs">
                All entries are immutable and fetched directly from Firestore
              </p>
            </div>
          )}

          {/* Details Dialog */}
          <Dialog open={!!detailsDialog} onOpenChange={(open) => !open && setDetailsDialog(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Audit Log Details</DialogTitle>
                <DialogDescription>
                  Complete audit trail information for compliance and security review
                </DialogDescription>
              </DialogHeader>
              {detailsDialog && (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Action</p>
                      <p className="text-sm text-muted-foreground">{detailsDialog.action}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Category</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Severity</p>
                      <p className="text-sm text-muted-foreground capitalize">{detailsDialog.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Timestamp</p>
                      <p className="text-sm text-muted-foreground">
                        {format(detailsDialog.timestamp, "MMM dd, yyyy hh:mm:ss a")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Performed By</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsDialog.userName} ({detailsDialog.userRole})
                      </p>
                      <p className="text-xs text-muted-foreground">{detailsDialog.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Target</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsDialog.targetType}
                        {detailsDialog.targetId && (
                          <span className="block text-xs mt-1">ID: {detailsDialog.targetId}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{detailsDialog.description}</p>
                  </div>

                  {/* Changes */}
                  {detailsDialog.changes && detailsDialog.changes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Changes Made</p>
                      <div className="space-y-2">
                        {detailsDialog.changes.map((change: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                            <span className="text-sm font-medium">{change.field}</span>
                            <div className="flex items-center gap-2 text-sm">
                              <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                {JSON.stringify(change.oldValue)}
                              </code>
                              <span>→</span>
                              <code className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                {JSON.stringify(change.newValue)}
                              </code>
                            </div>
                          </div>
                        ))}
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

                  {/* Technical Info */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Technical Information</p>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Log ID:</span>
                        <code className="font-mono">{detailsDialog.id}</code>
                      </div>
                      {detailsDialog.ipAddress && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IP Address:</span>
                          <code className="font-mono">{detailsDialog.ipAddress}</code>
                        </div>
                      )}
                      {detailsDialog.userAgent && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User Agent:</span>
                          <span className="text-right ml-4 truncate">{detailsDialog.userAgent}</span>
                        </div>
                      )}
                    </div>
                  </div>
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