"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { EmployeeListTable } from "@/components/employees/EmployeeListTable";
import { CreateEmployeeModal, type EmployeeFormData } from "@/components/employees/CreateEmployeeModal";
import { EditEmployeeModal, type EditEmployeeFormData } from "@/components/employees/EditEmployeeModal";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateEmployee } from "@/hooks/useCreateEmployee";
import { useUpdateEmployee } from "@/hooks/useUpdateEmployee";
import type { EmployeeStatus } from "@/types";

export default function EmployeesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  const { employees, loading, error, refresh } = useEmployees();
  const { createEmployee, loading: creating, error: createError, setError: setCreateError } = useCreateEmployee();
  const { updateEmployee, changeStatus, loading: updating, error: updateError, setError: setUpdateError } = useUpdateEmployee();

  const handleCreateEmployee = async (data: EmployeeFormData) => {
    try {
      await createEmployee({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        department: data.department || undefined,
        position: data.position || undefined,
        phoneNumber: data.phoneNumber || undefined,
        leaveBalances: data.leaveBalances
      });
      await refresh();
    } catch (err) {
      // Error is already set by the hook
      throw err;
    }
  };

  const handleStatusToggle = async (id: string, newStatus: EmployeeStatus) => {
    try {
      const enable = newStatus === "active";
      await changeStatus(id, enable);
      await refresh();
    } catch (err) {
      console.error("Failed to toggle employee status", err);
    }
  };

  const handleEdit = (id: string) => {
    setEditingEmployeeId(id);
  };

  const handleUpdateEmployee = async (id: string, data: EditEmployeeFormData) => {
    try {
      await updateEmployee({
        uid: id,
        fullName: data.fullName,
        department: data.department || undefined,
        position: data.position || undefined,
        phoneNumber: data.phoneNumber || undefined,
        leaveBalances: data.leaveBalances
      });
      await refresh();
    } catch (err) {
      throw err;
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export employee data");
  };

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="p-6 pt-4">
          <EmployeeListTable
            employees={employees}
            loading={loading}
            error={error}
            onCreateClick={() => setCreateModalOpen(true)}
            onEditClick={handleEdit}
            onStatusToggle={handleStatusToggle}
            onExport={handleExport}
          />

          <CreateEmployeeModal
            open={createModalOpen}
            onOpenChange={setCreateModalOpen}
            onSubmit={handleCreateEmployee}
            loading={creating}
            error={createError}
          />

          <EditEmployeeModal
            open={!!editingEmployeeId}
            onOpenChange={(open) => !open && setEditingEmployeeId(null)}
            employee={employees.find(emp => emp.id === editingEmployeeId) || null}
            onSubmit={handleUpdateEmployee}
            loading={updating}
            error={updateError}
          />
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}