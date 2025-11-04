"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { usePenalties } from "@/hooks/usePenalties";
import { useEmployees } from "@/hooks/useEmployees";
import { callWaivePenalty } from "@/lib/firebase/functions";

// Import new components
import { PenaltyCard } from "@/components/penalties/PenaltyCard";
import { PenaltyCardSkeleton } from "@/components/penalties/PenaltyCardSkeleton";
import { PenaltyFilters } from "@/components/penalties/PenaltyFilters";
import { DollarSign, AlertCircle, FileText, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function PenaltiesPage() {
  const [detailsDialog, setDetailsDialog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    violationType: "all",
    dateRange: { start: null as Date | null, end: null as Date | null },
    employee: "all",
    amountRange: { min: null as number | null, max: null as number | null }
  });

  const { records, loading, error, refresh } = usePenalties();
  const { employees } = useEmployees();
  const [waiveSubmitting, setWaiveSubmitting] = useState(false);

  // Transform and filter penalties
  const transformedPenalties = useMemo(() => {
    if (!records) return [];

    return records
      .filter((penalty) => {
        // Apply filters
        if (filters.search) {
          const employee = employees.find(e => e.id === penalty.userId);
          const searchLower = filters.search.toLowerCase();
          if (!employee?.fullName?.toLowerCase().includes(searchLower) &&
              !penalty.userName?.toLowerCase().includes(searchLower) &&
              !penalty.waivedReason?.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        if (filters.status !== "all" && penalty.status !== filters.status) {
          return false;
        }

        if (filters.violationType !== "all" && penalty.violationType !== filters.violationType) {
          return false;
        }

        if (filters.employee && filters.employee !== "all" && penalty.userId !== filters.employee) {
          return false;
        }

        if (filters.dateRange.start && penalty.dateIncurred && penalty.dateIncurred < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end && penalty.dateIncurred && penalty.dateIncurred > filters.dateRange.end) {
          return false;
        }

        if (filters.amountRange.min !== null && penalty.amount < filters.amountRange.min) {
          return false;
        }

        if (filters.amountRange.max !== null && penalty.amount > filters.amountRange.max) {
          return false;
        }

        return true;
      })
      .map((penalty) => {
        const employee = employees.find(e => e.id === penalty.userId);
        return {
          id: penalty.id,
          userId: penalty.userId,
          userName: penalty.userName || employee?.fullName || "Unknown",
          userEmail: penalty.userEmail || employee?.email || "",
          department: employee?.department || "Engineering",
          avatar: undefined,
          violationType: penalty.violationType || "multiple" as any,
          violationCount: (penalty as any).violationCount || 1,
          violationDates: (penalty as any).violationDates?.map((d: any) => new Date(d)) || [],
          amount: penalty.amount || 0,
          currency: "USD",
          status: penalty.status === "active" ? "pending" :
                  penalty.status === "waived" ? "waived" :
                  penalty.status === "disputed" ? "acknowledged" :
                  penalty.status === "paid" ? "paid" : "pending" as any,
          issuedAt: penalty.dateIncurred || new Date(),
          dueDate: (penalty as any).dueDate || undefined,
          acknowledgedAt: (penalty as any).acknowledgedAt,
          acknowledgedBy: (penalty as any).acknowledgedBy,
          waivedAt: (penalty as any).waivedAt,
          waivedBy: (penalty as any).waivedBy,
          waiverReason: (penalty as any).waivedReason,
          paidAt: (penalty as any).paidAt,
          paymentMethod: (penalty as any).paymentMethod,
          notes: (penalty as any).notes,
          month: (penalty as any).month || format(new Date(), "yyyy-MM")
        };
      });
  }, [records, employees, filters]);

  // Separate penalties by status
  const pendingPenalties = transformedPenalties.filter(p => p.status === "pending");
  const acknowledgedPenalties = transformedPenalties.filter(p => p.status === "acknowledged");
  const waivedPenalties = transformedPenalties.filter(p => p.status === "waived");
  const paidPenalties = transformedPenalties.filter(p => p.status === "paid");

  // Calculate stats
  const stats = useMemo(() => {
    const pending = pendingPenalties.length;
    const acknowledged = acknowledgedPenalties.length;
    const waived = waivedPenalties.length;
    const paid = paidPenalties.length;
    const totalAmount = transformedPenalties.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = pendingPenalties.reduce((sum, p) => sum + p.amount, 0);

    return {
      pending,
      acknowledged,
      waived,
      paid,
      totalAmount,
      pendingAmount
    };
  }, [pendingPenalties, acknowledgedPenalties, waivedPenalties, paidPenalties, transformedPenalties]);

  const handleWaive = async (id: string, reason: string) => {
    setWaiveSubmitting(true);
    try {
      await callWaivePenalty({ penaltyId: id, waivedReason: reason.trim() });
      await refresh();
    } catch (err) {
      console.error("Failed to waive penalty", err);
    } finally {
      setWaiveSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string, method: string) => {
    // TODO: Implement mark as paid functionality via a Firebase function
    console.log("Marking penalty as paid", id, method);
    await refresh();
  };

  const handleExport = () => {
    console.log("Exporting penalties");
  };

  const handleViewDetails = (penalty: any) => {
    setDetailsDialog(penalty);
  };

  const getPenaltiesByTab = () => {
    switch (activeTab) {
      case "pending":
        return pendingPenalties;
      case "acknowledged":
        return acknowledgedPenalties;
      case "waived":
        return waivedPenalties;
      case "paid":
        return paidPenalties;
      default:
        return transformedPenalties;
    }
  };

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Filters */}
          <PenaltyFilters
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
            <TabsList className="grid w-full max-w-[500px] grid-cols-5">
              <TabsTrigger value="all">
                All ({transformedPenalties.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingPenalties.length})
              </TabsTrigger>
              <TabsTrigger value="acknowledged">
                Ack'd ({acknowledgedPenalties.length})
              </TabsTrigger>
              <TabsTrigger value="waived">
                Waived ({waivedPenalties.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid ({paidPenalties.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <PenaltyCardSkeleton key={index} />
                  ))}
                </div>
              ) : getPenaltiesByTab().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <DollarSign className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900">No penalties found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeTab === "all"
                      ? "No penalties match your filters"
                      : `No ${activeTab} penalties`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getPenaltiesByTab().map((penalty) => (
                    <PenaltyCard
                      key={penalty.id}
                      penalty={penalty}
                      onWaive={activeTab !== "waived" && activeTab !== "paid" ? handleWaive : undefined}
                      onMarkPaid={activeTab !== "paid" ? handleMarkPaid : undefined}
                      onViewDetails={handleViewDetails}
                      isProcessing={waiveSubmitting}
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
                <DialogTitle>Penalty Details</DialogTitle>
                <DialogDescription>
                  Complete information about the penalty and violations
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
                      <p className="text-sm text-muted-foreground">Issued on</p>
                      <p className="text-sm font-medium">
                        {format(detailsDialog.issuedAt, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Penalty Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Violation Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {detailsDialog.violationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Status</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {detailsDialog.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Amount</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsDialog.currency} {detailsDialog.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Period</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(detailsDialog.month + "-01"), "MMMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Violations</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsDialog.violationCount} violation{detailsDialog.violationCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    {detailsDialog.dueDate && (
                      <div>
                        <p className="text-sm font-medium mb-1">Due Date</p>
                        <p className="text-sm text-muted-foreground">
                          {format(detailsDialog.dueDate, "MMM dd, yyyy")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Violation Dates */}
                  {detailsDialog.violationDates.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Violation Dates</p>
                      <div className="flex flex-wrap gap-2">
                        {detailsDialog.violationDates.map((date: Date, idx: number) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded">
                            {format(date, "MMM dd, yyyy")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {detailsDialog.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {detailsDialog.notes}
                      </p>
                    </div>
                  )}

                  {/* Status History */}
                  <div className="space-y-2">
                    {detailsDialog.acknowledgedAt && (
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-sm font-medium text-blue-900">Acknowledged</p>
                        <p className="text-xs text-blue-700">
                          By {detailsDialog.acknowledgedBy || "Employee"} on{" "}
                          {format(detailsDialog.acknowledgedAt, "MMM dd, yyyy 'at' hh:mm a")}
                        </p>
                      </div>
                    )}
                    {detailsDialog.waivedAt && (
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-sm font-medium text-green-900">Waived</p>
                        <p className="text-xs text-green-700">
                          By {detailsDialog.waivedBy} on{" "}
                          {format(detailsDialog.waivedAt, "MMM dd, yyyy 'at' hh:mm a")}
                        </p>
                        {detailsDialog.waiverReason && (
                          <p className="text-xs text-green-600 mt-1 italic">
                            Reason: {detailsDialog.waiverReason}
                          </p>
                        )}
                      </div>
                    )}
                    {detailsDialog.paidAt && (
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-900">Paid</p>
                        <p className="text-xs text-gray-700">
                          On {format(detailsDialog.paidAt, "MMM dd, yyyy 'at' hh:mm a")}
                          {detailsDialog.paymentMethod && (
                            <> via {detailsDialog.paymentMethod.replace("_", " ")}</>
                          )}
                        </p>
                      </div>
                    )}
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