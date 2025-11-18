"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2, Users, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import type { ScopeConfig } from "./ReportBuilder";

interface ScopeCardProps {
  value: ScopeConfig;
  onChange: (value: ScopeConfig) => void;
}

const scopeOptions = [
  {
    level: "company" as const,
    icon: Building2,
    title: "Entire Company",
    description: "All employees across all departments",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    level: "department" as const,
    icon: Users,
    title: "By Department",
    description: "Select specific departments",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    level: "individual" as const,
    icon: User,
    title: "Individual Employees",
    description: "Select specific employees",
    color: "text-green-600",
    bgColor: "bg-green-100"
  }
];

export function ScopeCard({ value, onChange }: ScopeCardProps) {
  const { employees } = useEmployees();

  // Get unique departments from employees
  const departments = Array.from(
    new Set(
      employees
        .map(emp => emp.department)
        .filter((dept): dept is string => dept != null && dept !== "")
    )
  ).sort();

  const handleLevelChange = (level: ScopeConfig["level"]) => {
    onChange({
      level,
      departments: level === "department" ? [] : undefined,
      employees: level === "individual" ? [] : undefined
    });
  };

  const handleDepartmentToggle = (department: string, checked: boolean) => {
    const current = value.departments || [];
    const updated = checked
      ? [...current, department]
      : current.filter(d => d !== department);

    onChange({
      ...value,
      departments: updated
    });
  };

  const handleEmployeeToggle = (employeeId: string, checked: boolean) => {
    const current = value.employees || [];
    const updated = checked
      ? [...current, employeeId]
      : current.filter(id => id !== employeeId);

    onChange({
      ...value,
      employees: updated
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-blue-600" />
          Report Scope
        </CardTitle>
        <CardDescription>Choose the organizational level</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scopeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value.level === option.level;

          return (
            <button
              key={option.level}
              type="button"
              onClick={() => handleLevelChange(option.level)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isSelected ? option.bgColor : "bg-gray-100"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  isSelected ? option.color : "text-gray-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-blue-900" : "text-gray-900"
                )}>
                  {option.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              )}
            </button>
          );
        })}

        {/* Department/Employee Count Display */}
        {value.level === "company" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mt-4">
            <Users className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-900">
              Including <span className="font-semibold">all employees</span>
            </p>
          </div>
        )}

        {value.level === "department" && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Select Departments</p>
              {value.departments && value.departments.length > 0 && (
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {value.departments.length} selected
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No departments found
                </p>
              ) : (
                departments.map((department) => (
                  <div key={department} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded">
                    <Checkbox
                      id={`dept-${department}`}
                      checked={value.departments?.includes(department) || false}
                      onCheckedChange={(checked) => handleDepartmentToggle(department, !!checked)}
                    />
                    <Label
                      htmlFor={`dept-${department}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {department}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {value.level === "individual" && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Select Employees</p>
              {value.employees && value.employees.length > 0 && (
                <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  {value.employees.length} selected
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No employees found
                </p>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded">
                    <Checkbox
                      id={`emp-${employee.id}`}
                      checked={value.employees?.includes(employee.id) || false}
                      onCheckedChange={(checked) => handleEmployeeToggle(employee.id, !!checked)}
                    />
                    <Label
                      htmlFor={`emp-${employee.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      <div>
                        <p className="font-medium">{employee.fullName}</p>
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
