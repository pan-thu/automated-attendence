"use client";

import { use, useState } from "react";
import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";
import { useUpdateEmployee } from "@/hooks/useUpdateEmployee";
import { useEmployeeAttendance } from "@/hooks/useEmployeeAttendance";
import { useEmployeePenalties } from "@/hooks/useEmployeePenalties";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLeaves } from "@/hooks/useLeaves";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";

// Import all profile components
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ContactCard } from "@/components/profile/ContactCard";
import { EmploymentCard } from "@/components/profile/EmploymentCard";
import { TodayStatusCard } from "@/components/profile/TodayStatusCard";
import { LeaveBalanceCard } from "@/components/profile/LeaveBalanceCard";
import { AttendanceCalendar } from "@/components/profile/AttendanceCalendar";
import { PenaltiesCard } from "@/components/profile/PenaltiesCard";

// Edit dialog components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { employee, loading, error, refresh } = useEmployeeDetail(id);
  const { updateEmployee, changeStatus, loading: saving } = useUpdateEmployee();
  const { attendanceRecords, todayAttendance, loading: attendanceLoading } = useEmployeeAttendance(id);
  const { penalties, loading: penaltiesLoading } = useEmployeePenalties(id);
  const { settings } = useCompanySettings();
  const { records: leaveRecords, loading: leavesLoading } = useLeaves({ userId: id });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form states for editing
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    position: "",
    phoneNumber: "",
    leaveBalances: {} as Record<string, number>
  });

  const handleEdit = () => {
    if (!employee) return;

    setFormData({
      fullName: employee.fullName || "",
      department: employee.department || "",
      position: employee.position || "",
      phoneNumber: employee.phoneNumber || "",
      leaveBalances: employee.leaveBalances || {}
    });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      await updateEmployee({
        uid: employee.id,
        fullName: formData.fullName,
        department: formData.department || undefined,
        position: formData.position || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        leaveBalances: formData.leaveBalances
      });
      setShowEditDialog(false);
      await refresh();
    } catch (err) {
      console.error("Failed to update employee", err);
    }
  };

  const handleStatusToggle = async () => {
    if (!employee) return;

    try {
      await changeStatus(employee.id, employee.status !== "active");
      await refresh();
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleWaivePenalty = async (penaltyId: string) => {
    // This would call a waive penalty function
    console.log("Waiving penalty:", penaltyId);
  };

  const handleViewAllPenalties = () => {
    setActiveTab("penalties");
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DashboardLayout>
      </ProtectedLayout>
    );
  }

  if (error || !employee) {
    return (
      <ProtectedLayout>
        <DashboardLayout>
          <div className="p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error || "Employee not found"}</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          {/* Profile Header */}
          <ProfileHeader
            employee={employee}
            onEdit={handleEdit}
            onStatusToggle={handleStatusToggle}
            loading={saving}
          />

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-[500px] grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leaves">Leaves</TabsTrigger>
              <TabsTrigger value="penalties">Penalties</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <TodayStatusCard
                    attendanceToday={todayAttendance || undefined}
                    loading={attendanceLoading}
                  />
                  <div className="grid gap-6 md:grid-cols-2">
                    <ContactCard employee={employee} />
                    <EmploymentCard employee={employee} />
                  </div>
                </div>
                <div className="space-y-6">
                  <LeaveBalanceCard
                    leaveBalances={employee.leaveBalances}
                    leavePolicy={settings?.leavePolicy}
                  />
                  <PenaltiesCard
                    penalties={penalties}
                    loading={penaltiesLoading}
                    onViewAll={handleViewAllPenalties}
                    onWaivePenalty={handleWaivePenalty}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <AttendanceCalendar
                attendance={attendanceRecords.map(record => ({
                  date: record.date,
                  status: record.status,
                  checkIn: record.check1Timestamp?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                  checkOut: record.check3Timestamp?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                }))}
                loading={attendanceLoading}
              />
            </TabsContent>

            {/* Leaves Tab */}
            <TabsContent value="leaves" className="space-y-6">
              <LeaveBalanceCard
                leaveBalances={employee.leaveBalances}
                leavePolicy={settings?.leavePolicy}
              />

              {/* Leave History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Leave History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leavesLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : leaveRecords.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No leave requests found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaveRecords.map((leave) => {
                        const statusConfig = {
                          approved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
                          rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
                          pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
                          cancelled: { icon: XCircle, color: "text-gray-600", bg: "bg-gray-100" },
                        };
                        const config = statusConfig[leave.status] || statusConfig.pending;
                        const StatusIcon = config.icon;

                        return (
                          <div
                            key={leave.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${config.bg}`}>
                                <StatusIcon className={`h-4 w-4 ${config.color}`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {leave.leaveType?.replace(/_/g, " ") || "Leave"}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {leave.startDate ? format(leave.startDate, "MMM d") : "N/A"}
                                    {" - "}
                                    {leave.endDate ? format(leave.endDate, "MMM d, yyyy") : "N/A"}
                                  </span>
                                  <span>•</span>
                                  <span>{leave.totalDays} day{leave.totalDays !== 1 ? "s" : ""}</span>
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`capitalize ${config.color} ${config.bg} border-0`}
                            >
                              {leave.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Penalties Tab */}
            <TabsContent value="penalties" className="space-y-6">
              <PenaltiesCard
                penalties={penalties}
                loading={penaltiesLoading}
                onWaivePenalty={handleWaivePenalty}
              />
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Employee Information</DialogTitle>
                <DialogDescription>
                  Update employee details. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-position">Position</Label>
                  <Input
                    id="edit-position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                {/* Leave Balances Section */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-medium">Leave Balances</h4>
                  <div className="grid gap-3 grid-cols-3">
                    {Object.entries(formData.leaveBalances || {})
                      .filter(([key]) => ["fullLeaveBalance", "medicalLeaveBalance", "maternityLeaveBalance"].includes(key))
                      .map(([key, value]) => {
                        const labels: Record<string, string> = {
                          fullLeaveBalance: "Full Leave",
                          medicalLeaveBalance: "Medical Leave",
                          maternityLeaveBalance: "Maternity Leave"
                        };
                        return (
                          <div key={key} className="grid gap-2">
                            <Label htmlFor={`edit-${key}`} className="text-xs">
                              {labels[key] || key}
                            </Label>
                            <Input
                              id={`edit-${key}`}
                              type="number"
                              min="0"
                              value={value}
                              onChange={(e) => setFormData({
                                ...formData,
                                leaveBalances: {
                                  ...formData.leaveBalances,
                                  [key]: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}