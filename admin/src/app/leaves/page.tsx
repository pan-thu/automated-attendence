"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useLeaves } from "@/hooks/useLeaves";
import { useLeaveApproval } from "@/hooks/useLeaveApproval";
import { useEmployees } from "@/hooks/useEmployees";

// Import new components
import { LeaveRequestCard } from "@/components/leaves/LeaveRequestCard";
import { LeaveRequestCardSkeleton } from "@/components/leaves/LeaveRequestCardSkeleton";
import { LeaveFilters } from "@/components/leaves/LeaveFilters";
import { Calendar, FileText, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function LeavesPage() {
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    leaveType: "all",
    dateRange: { start: null as Date | null, end: null as Date | null },
    employee: "all"
  });

  const { records, loading, error, refresh } = useLeaves();
  const { employees } = useEmployees();
  const { submitLeaveDecision, loading: processing } = useLeaveApproval();

  // Create a map of employees for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, typeof employees[0]>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Filter and transform records
  const transformedRecords = useMemo(() => {
    if (!records) return [];

    return records
      .filter((record) => {
        // Get employee for search
        const employee = employeeMap.get(record.userId);
        const employeeName = employee?.fullName || record.userName || "";

        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!employeeName.toLowerCase().includes(searchLower) &&
              !record.notes?.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        if (filters.status !== "all" && record.status !== filters.status) {
          return false;
        }

        if (filters.leaveType !== "all" && record.leaveType !== filters.leaveType) {
          return false;
        }

        if (filters.employee && filters.employee !== "all" && record.userId !== filters.employee) {
          return false;
        }

        if (filters.dateRange.start && record.startDate && record.startDate < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end && record.endDate && record.endDate > filters.dateRange.end) {
          return false;
        }

        return true;
      })
      .map((record) => {
        // Look up employee details
        const employee = employeeMap.get(record.userId);

        return {
          id: record.id,
          userId: record.userId,
          userName: employee?.fullName || record.userName || "Unknown",
          userEmail: employee?.email || record.userEmail || "",
          department: employee?.department || undefined,
          avatar: employee?.photoURL || undefined,
          leaveType: record.leaveType as any,
          startDate: record.startDate || new Date(),
          endDate: record.endDate || new Date(),
          totalDays: record.totalDays,
          reason: record.notes || "",
          status: record.status as any,
          appliedAt: record.appliedAt || new Date(),
          attachments: (record as any).attachments?.map((a: any) => ({
            id: a.id,
            name: a.fileName || "Document",
            url: a.url || ""
          })),
          reviewedBy: (record as any).reviewedBy,
          reviewedAt: (record as any).reviewedAt,
          reviewerNotes: record.reviewerNotes || undefined,
        };
      });
  }, [records, filters, employeeMap]);

  // Separate records by status
  const pendingRecords = transformedRecords.filter(r => r.status === "pending");
  const approvedRecords = transformedRecords.filter(r => r.status === "approved");
  const rejectedRecords = transformedRecords.filter(r => r.status === "rejected");

  // Calculate stats
  const stats = useMemo(() => ({
    pending: pendingRecords.length,
    approved: approvedRecords.length,
    rejected: rejectedRecords.length,
    total: transformedRecords.length
  }), [pendingRecords, approvedRecords, rejectedRecords, transformedRecords]);

  const handleApprove = async (id: string, notes: string) => {
    try {
      await submitLeaveDecision({
        requestId: id,
        action: "approve",
        notes: notes
      });
      await refresh();
    } catch (err) {
      console.error("Failed to approve leave", err);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await submitLeaveDecision({
        requestId: id,
        action: "reject",
        notes: notes
      });
      await refresh();
    } catch (err) {
      console.error("Failed to reject leave", err);
    }
  };

  const handleExport = () => {
    console.log("Exporting leave requests");
  };

  const handleViewDetails = (request: any) => {
    setDetailsDialog(request);
  };

  const getRecordsByTab = () => {
    switch (activeTab) {
      case "pending":
        return pendingRecords;
      case "approved":
        return approvedRecords;
      case "rejected":
        return rejectedRecords;
      default:
        return transformedRecords;
    }
  };

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Filters */}
          <LeaveFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refresh}
            onExport={handleExport}
            isLoading={loading}
            employees={employees.map(e => ({ id: e.id, name: e.fullName }))}
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
            <TabsList className="grid w-full max-w-[400px] grid-cols-4">
              <TabsTrigger value="all">
                All ({transformedRecords.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingRecords.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedRecords.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedRecords.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <LeaveRequestCardSkeleton key={index} />
                  ))}
                </div>
              ) : getRecordsByTab().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900">No leave requests found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeTab === "all"
                      ? "No leave requests match your filters"
                      : `No ${activeTab} leave requests`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getRecordsByTab().map((request) => (
                    <LeaveRequestCard
                      key={request.id}
                      request={request}
                      onApprove={activeTab === "pending" ? handleApprove : undefined}
                      onReject={activeTab === "pending" ? handleReject : undefined}
                      onViewDetails={handleViewDetails}
                      isProcessing={processing}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Details Dialog */}
          <Dialog open={!!detailsDialog} onOpenChange={(open) => !open && setDetailsDialog(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Leave Request Details</DialogTitle>
                <DialogDescription>
                  Complete information about the leave request
                </DialogDescription>
              </DialogHeader>
              {detailsDialog && (
                <div className="space-y-4">
                  {/* Employee Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{detailsDialog.userName}</h3>
                      <p className="text-sm text-muted-foreground">{detailsDialog.userEmail}</p>
                      {detailsDialog.department && (
                        <p className="text-sm text-muted-foreground">{detailsDialog.department}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Applied on</p>
                      <p className="text-sm font-medium">
                        {format(detailsDialog.appliedAt, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Leave Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {detailsDialog.leaveType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Status</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {detailsDialog.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Start Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(detailsDialog.startDate, "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(detailsDialog.endDate, "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Total Days</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsDialog.totalDays} day{detailsDialog.totalDays > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <p className="text-sm font-medium mb-1">Reason</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailsDialog.reason || "No reason provided"}
                    </p>
                  </div>

                  {/* Attachments */}
                  {detailsDialog.attachments && detailsDialog.attachments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Attachments</p>
                      <div className="space-y-2">
                        {detailsDialog.attachments.map((att: any) => (
                          <div key={att.id} className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {att.name}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Notes */}
                  {detailsDialog.reviewerNotes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Review Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {detailsDialog.reviewerNotes}
                      </p>
                      {detailsDialog.reviewedBy && detailsDialog.reviewedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Reviewed by {detailsDialog.reviewedBy} on{" "}
                          {format(detailsDialog.reviewedAt, "MMM dd, yyyy")}
                        </p>
                      )}
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