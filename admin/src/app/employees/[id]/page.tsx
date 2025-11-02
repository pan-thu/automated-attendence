"use client";

import { use, useState } from "react";
import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";
import { useUpdateEmployee } from "@/hooks/useUpdateEmployee";
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
import { ViolationsTable } from "@/components/profile/ViolationsTable";
import { StatsSummary } from "@/components/profile/StatsSummary";

// Edit dialog components
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { employee, loading, error, refresh } = useEmployeeDetail(id);
  const { updateEmployee, changeStatus, loading: saving } = useUpdateEmployee();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form states for editing
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    position: "",
    phoneNumber: "",
    address: "",
    emergencyContact: ""
  });

  const handleEdit = () => {
    if (!employee) return;

    setFormData({
      fullName: employee.fullName || "",
      department: employee.department || "",
      position: employee.position || "",
      phoneNumber: employee.phoneNumber || "",
      address: (employee as any).address || "",
      emergencyContact: (employee as any).emergencyContact || ""
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
        // Note: address and emergencyContact might need to be added to the update function
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

  const handleExportViolations = () => {
    // This would export violations to CSV
    console.log("Exporting violations");
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
            <TabsList className="grid w-full max-w-[600px] grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leaves">Leaves</TabsTrigger>
              <TabsTrigger value="penalties">Penalties</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <TodayStatusCard />
                  <div className="grid gap-6 md:grid-cols-2">
                    <ContactCard employee={employee} />
                    <EmploymentCard employee={employee} />
                  </div>
                </div>
                <div className="space-y-6">
                  <LeaveBalanceCard leaveBalances={employee.leaveBalances} />
                  <PenaltiesCard
                    onViewAll={handleViewAllPenalties}
                    onWaivePenalty={handleWaivePenalty}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <AttendanceCalendar />
              <ViolationsTable
                onExport={handleExportViolations}
              />
            </TabsContent>

            {/* Leaves Tab */}
            <TabsContent value="leaves" className="space-y-6">
              <LeaveBalanceCard leaveBalances={employee.leaveBalances} />
              {/* Leave history table would go here */}
              <div className="rounded-lg border bg-card p-6">
                <p className="text-center text-sm text-muted-foreground">
                  Leave history will be displayed here
                </p>
              </div>
            </TabsContent>

            {/* Penalties Tab */}
            <TabsContent value="penalties" className="space-y-6">
              <PenaltiesCard
                onWaivePenalty={handleWaivePenalty}
              />
              <ViolationsTable
                onExport={handleExportViolations}
              />
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <StatsSummary />
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-emergency">Emergency Contact</Label>
                  <Input
                    id="edit-emergency"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
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