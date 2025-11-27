"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Briefcase,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Award,
  Hash
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EmployeeDetail } from "@/types";

interface EmploymentCardProps {
  employee: EmployeeDetail;
  loading?: boolean;
}

export function EmploymentCard({ employee, loading = false }: EmploymentCardProps) {
  // Calculate tenure if joined date is available
  const calculateTenure = () => {
    if (!employee.createdAt) return "N/A";

    const joinDate = new Date(employee.createdAt);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 +
                      (now.getMonth() - joinDate.getMonth());

    if (monthsDiff < 1) return "Less than a month";
    if (monthsDiff < 12) return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;

    const years = Math.floor(monthsDiff / 12);
    const months = monthsDiff % 12;

    let tenure = `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) {
      tenure += ` ${months} month${months > 1 ? 's' : ''}`;
    }

    return tenure;
  };

  const employmentDetails = [
    {
      label: "Department",
      value: employee.department || "Not assigned",
      icon: Building,
      highlight: true
    },
    {
      label: "Position",
      value: employee.position || "Not specified",
      icon: Briefcase,
      highlight: true
    },
    {
      label: "Employee ID",
      value: (employee as any).employeeId || employee.id.slice(0, 8).toUpperCase(),
      icon: Hash,
      highlight: false
    },
    {
      label: "Manager",
      value: (employee as any).manager || "Not assigned",
      icon: Users,
      highlight: false
    },
    {
      label: "Employment Type",
      value: (employee as any).employmentType || "Full-time",
      icon: Clock,
      highlight: false
    },
    {
      label: "Work Location",
      value: (employee as any).workLocation || "Main Office",
      icon: Building,
      highlight: false
    }
  ];

  const compensationInfo = [
    {
      label: "Salary Grade",
      value: (employee as any).salaryGrade || "Not specified",
      icon: DollarSign
    },
    {
      label: "Performance Rating",
      value: (employee as any).performanceRating || "Not evaluated",
      icon: Award
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Employment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Tenure Badge */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Tenure</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {calculateTenure()}
                </span>
              </div>
              {employee.createdAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Joined on {format(new Date(employee.createdAt), "MMMM dd, yyyy")}
                </p>
              )}
            </div>

            {/* Primary Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              {employmentDetails.slice(0, 2).map((item) => {
                const Icon = item.icon;
                const isEmpty = item.value.includes("Not");

                return (
                  <div
                    key={item.label}
                    className={cn(
                      "p-3 rounded-lg",
                      item.highlight ? "bg-muted/50" : ""
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <p className={cn(
                      "font-medium",
                      isEmpty ? "text-muted-foreground italic text-sm" : ""
                    )}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Additional Details */}
            <div className="space-y-3">
              {employmentDetails.slice(2).map((item) => {
                const Icon = item.icon;
                const isEmpty = item.value.includes("Not");

                return (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    {item.label === "Employee ID" ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {item.value}
                      </code>
                    ) : item.label === "Employment Type" ? (
                      <Badge variant="secondary">
                        {item.value}
                      </Badge>
                    ) : (
                      <span className={cn(
                        "text-sm font-medium",
                        isEmpty ? "text-muted-foreground italic" : ""
                      )}>
                        {item.value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Compensation & Performance */}
            {((employee as any).salaryGrade || (employee as any).performanceRating) && (
              <>
                <div className="border-t" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Compensation & Performance
                  </h4>
                  {compensationInfo.map((item) => {
                    const Icon = item.icon;
                    const isEmpty = item.value.includes("Not");

                    return (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          isEmpty ? "text-muted-foreground italic" : ""
                        )}>
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Work Schedule */}
            {(employee as any).workSchedule && (
              <>
                <div className="border-t" />
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Work Schedule</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(employee as any).workSchedule}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}