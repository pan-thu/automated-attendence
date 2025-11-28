"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { AlertCircle, User, Mail, Phone, Building, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmployeeSummary } from "@/types";

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeSummary | null;
  onSubmit: (id: string, data: EditEmployeeFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface EditEmployeeFormData {
  fullName: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: Record<string, number>;
}

const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Product",
  "Design",
  "Customer Support",
  "Legal"
];

const positions = [
  "Junior Developer",
  "Senior Developer",
  "Team Lead",
  "Manager",
  "Director",
  "VP",
  "C-Level",
  "Analyst",
  "Specialist",
  "Coordinator"
];

// Map leave policy keys to friendly display labels
const LEAVE_TYPE_LABELS: Record<string, string> = {
  fullLeaveBalance: "Full Leave",
  medicalLeaveBalance: "Medical Leave",
  maternityLeaveBalance: "Maternity Leave",
};

export function EditEmployeeModal({
  open,
  onOpenChange,
  employee,
  onSubmit,
  loading = false,
  error = null
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState<EditEmployeeFormData>({
    fullName: "",
    department: "",
    position: "",
    phoneNumber: "",
    leaveBalances: {}
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof EditEmployeeFormData, string>>>({});

  // Populate form data when employee changes
  useEffect(() => {
    if (employee && open) {
      setFormData({
        fullName: employee.fullName || "",
        department: employee.department || "",
        position: employee.position || "",
        phoneNumber: employee.phoneNumber || "",
        leaveBalances: employee.leaveBalances || {}
      });
      setValidationErrors({});
    }
  }, [employee, open]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EditEmployeeFormData, string>> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee || !validateForm()) {
      return;
    }

    try {
      await onSubmit(employee.id, formData);
      setValidationErrors({});
      onOpenChange(false);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleCancel = () => {
    setValidationErrors({});
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee information for {employee.fullName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Personal Information</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      setValidationErrors({ ...validationErrors, fullName: undefined });
                    }}
                    className={cn(validationErrors.fullName && "border-red-500 focus:ring-red-500")}
                    disabled={loading}
                  />
                  {validationErrors.fullName && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={employee.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, phoneNumber: e.target.value });
                    setValidationErrors({ ...validationErrors, phoneNumber: undefined });
                  }}
                  className={cn(validationErrors.phoneNumber && "border-red-500 focus:ring-red-500")}
                  disabled={loading}
                />
                {validationErrors.phoneNumber && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Work Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Work Information</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    Department
                  </Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Position
                  </Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Leave Balances Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Leave Balances</h3>

              <div className="grid gap-4 grid-cols-3">
                {Object.keys(LEAVE_TYPE_LABELS).map((key) => {
                  const label = LEAVE_TYPE_LABELS[key];
                  const value = formData.leaveBalances?.[key] ?? 0;
                  return (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
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
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating...
                </span>
              ) : (
                "Update Employee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
