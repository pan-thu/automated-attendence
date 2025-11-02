"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { EmployeeListTable } from "@/components/employees/EmployeeListTable";
import { CreateEmployeeModal, type EmployeeFormData } from "@/components/employees/CreateEmployeeModal";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateEmployee } from "@/hooks/useCreateEmployee";
import type { EmployeeStatus } from "@/types";

export default function EmployeesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { employees, loading, error, refresh } = useEmployees();
  const { createEmployee, loading: creating, error: createError, setError: setCreateError } = useCreateEmployee();

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
    // TODO: Implement status toggle
    console.log("Toggle status for", id, "to", newStatus);
    await refresh();
  };

  const handleEdit = (id: string) => {
    // TODO: Implement edit functionality
    console.log("Edit employee", id);
  };

  const handleDelete = async (id: string) => {
    // TODO: Implement delete functionality
    if (confirm("Are you sure you want to delete this employee?")) {
      console.log("Delete employee", id);
      await refresh();
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
            onDeleteClick={handleDelete}
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
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}