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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { AlertCircle, User, Mail, Lock, Phone, Building, Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface CreateEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface EmployeeFormData {
  fullName: string;
  email: string;
  password: string;
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
  halfLeaveBalance: "Half Leave",
};

export function CreateEmployeeModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  error = null
}: CreateEmployeeModalProps) {
  const { settings } = useCompanySettings();

  const getInitialLeaveBalances = (): Record<string, number> => {
    const leavePolicy = settings?.leavePolicy ?? {};
    const balances: Record<string, number> = {};

    // Initialize from company settings leave policy
    for (const [key, value] of Object.entries(leavePolicy)) {
      balances[key] = value ?? 0;
    }

    return balances;
  };

  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: "",
    email: "",
    password: "",
    department: "",
    position: "",
    phoneNumber: "",
    leaveBalances: {}
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Update leave balances when company settings load or modal opens
  useEffect(() => {
    if (open && settings?.leavePolicy) {
      setFormData(prev => ({
        ...prev,
        leaveBalances: getInitialLeaveBalances()
      }));
    }
  }, [open, settings?.leavePolicy]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EmployeeFormData, string>> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        fullName: "",
        email: "",
        password: "",
        department: "",
        position: "",
        phoneNumber: "",
        leaveBalances: getInitialLeaveBalances()
      });
      setValidationErrors({});
      onOpenChange(false);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      department: "",
      position: "",
      phoneNumber: "",
      leaveBalances: getInitialLeaveBalances()
    });
    setValidationErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Employee</DialogTitle>
          <DialogDescription>
            Add a new employee to your organization. They will receive an email invitation to set up their account.
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
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setValidationErrors({ ...validationErrors, email: undefined });
                    }}
                    className={cn(validationErrors.email && "border-red-500 focus:ring-red-500")}
                    disabled={loading}
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Temporary Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setValidationErrors({ ...validationErrors, password: undefined });
                      }}
                      className={cn(validationErrors.password && "border-red-500 focus:ring-red-500")}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
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
              <h3 className="text-sm font-medium text-muted-foreground">Initial Leave Balances</h3>

              <div className="grid gap-4 grid-cols-3">
                {Object.entries(formData.leaveBalances || {}).map(([key, value]) => {
                  const label = LEAVE_TYPE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
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
                  Creating...
                </span>
              ) : (
                "Create Employee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}