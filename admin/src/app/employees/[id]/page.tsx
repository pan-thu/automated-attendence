"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";
import { useUpdateEmployee } from "@/hooks/useUpdateEmployee";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";

const formatStatus = (isActive: boolean) => (isActive ? "Active" : "Inactive");

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { employee, loading, error, refresh } = useEmployeeDetail(id);
  const { updateEmployee, changeStatus, loading: saving, error: updateError, setError: setUpdateError } =
    useUpdateEmployee();

  const [formName, setFormName] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;
    setFormName(employee.fullName ?? "");
    setFormDepartment(employee.department ?? "");
    setFormPosition(employee.position ?? "");
    setFormPhone(employee.phoneNumber ?? "");
    setBalances(employee.leaveBalances ?? {});
  }, [employee]);

  const formattedBalances = useMemo(() => Object.entries(balances), [balances]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;

    try {
      await updateEmployee({
        uid: employee.id,
        fullName: formName,
        department: formDepartment || undefined,
        position: formPosition || undefined,
        phoneNumber: formPhone || undefined,
        leaveBalances: balances,
      });
      setSuccessMessage("Employee updated successfully.");
      setUpdateError(null);
      await refresh();
    } catch (err) {
      console.error("Failed to update employee", err);
    }
  }

  async function handleToggleStatus() {
    if (!employee) return;
    try {
      await changeStatus(employee.id, employee.status !== "active");
      setSuccessMessage(
        employee.status === "active" ? "Employee deactivated successfully." : "Employee activated successfully."
      );
      setUpdateError(null);
      await refresh();
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link className="text-xs text-muted-foreground hover:text-foreground" href="/employees">
                ← Back to employees
              </Link>
              <h1 className="mt-2 text-2xl font-semibold">Employee Details</h1>
              <p className="text-sm text-muted-foreground">View and update personal details and leave balances.</p>
            </div>
            <Button type="button" variant={employee?.status === "active" ? "destructive" : "secondary"} onClick={handleToggleStatus} disabled={saving || !employee}>
              {employee?.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </header>

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {updateError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {updateError}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading employee...</div>
          ) : employee ? (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <section className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="text-xs text-muted-foreground">Update personal details and role data.</p>
                <form className="mt-4 space-y-5" onSubmit={handleSave}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label requiredMarker htmlFor="fullName">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        value={formName}
                        onChange={(event) => setFormName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={employee.email} disabled />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formDepartment}
                        onChange={(event) => setFormDepartment(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input id="position" value={formPosition} onChange={(event) => setFormPosition(event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone number</Label>
                      <Input id="phone" value={formPhone} onChange={(event) => setFormPhone(event.target.value)} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Input value={formatStatus(employee.isActive)} disabled />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormName(employee.fullName ?? "");
                        setFormDepartment(employee.department ?? "");
                        setFormPosition(employee.position ?? "");
                        setFormPhone(employee.phoneNumber ?? "");
                        setBalances(employee.leaveBalances ?? {});
                        setSuccessMessage(null);
                        setUpdateError(null);
                      }}
                      disabled={saving}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              </section>

              <section className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Leave Balances</h2>
                <p className="text-xs text-muted-foreground">Adjust leave allocations per policy.</p>
                <div className="mt-4 space-y-4">
                  {formattedBalances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leave balance details available.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formattedBalances.map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={value}
                                onChange={(event) =>
                                  setBalances((prev) => ({
                                    ...prev,
                                    [key]: Number(event.target.value ?? 0),
                                  }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Employee not found.</div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

