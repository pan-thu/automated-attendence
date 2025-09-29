"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateEmployee } from "@/hooks/useCreateEmployee";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";

interface CreateFormState {
  fullName: string;
  email: string;
  password: string;
  department: string;
  position: string;
  phoneNumber: string;
}

const defaultFormState: CreateFormState = {
  fullName: "",
  email: "",
  password: "",
  department: "",
  position: "",
  phoneNumber: "",
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function EmployeesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(defaultFormState);

  const { employees, loading, error, search, setSearch, status, setStatus, refresh } = useEmployees();
  const { createEmployee, loading: creating, error: createError, setError: setCreateError } = useCreateEmployee();

  const statusLabel = useMemo(() => statusOptions.find((option) => option.value === status)?.label ?? "All", [status]);

  async function handleCreateEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      setCreateError("Full name, email, and password are required.");
      return;
    }

    try {
      await createEmployee({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        department: form.department || undefined,
        position: form.position || undefined,
        phoneNumber: form.phoneNumber || undefined,
      });
      setForm(defaultFormState);
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      console.error("Create employee failed", err);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Employees</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage workforce roster and access details.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger>
                <Button type="button">Create Employee</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader title="Create Employee" description="Add a new employee account." />
                <form className="space-y-4" onSubmit={handleCreateEmployee}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label requiredMarker htmlFor="fullName">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label requiredMarker htmlFor="email">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label requiredMarker htmlFor="password">
                        Temporary password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={form.department}
                        onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={form.position}
                        onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="phoneNumber">Phone number</Label>
                      <Input
                        id="phoneNumber"
                        value={form.phoneNumber}
                        onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                      />
                    </div>
                  </div>

                  {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setForm(defaultFormState);
                        setCreateError(null);
                      }}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees"
                  className="w-full sm:w-64"
                />
                <Select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                  aria-label="Filter by status"
                  className="w-40"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="ghost" type="button" onClick={() => setSearch("")}
                disabled={!search}
              >
                Clear search
              </Button>
            </div>

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Loading employees...
                      </TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.fullName}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.department ?? "—"}</TableCell>
                        <TableCell>{employee.position ?? "—"}</TableCell>
                        <TableCell>
                          <span
                            className={
                              employee.status === "active"
                                ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-600"
                                : "rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                            }
                          >
                            {employee.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link className="text-sm font-medium text-primary hover:underline" href={`/employees/${employee.id}`}>
                            Manage
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {employees.length} {employees.length === 1 ? "employee" : "employees"} (Status: {statusLabel}).
            </p>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

