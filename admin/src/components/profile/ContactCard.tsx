"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  Calendar,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EmployeeDetail } from "@/types";

interface ContactCardProps {
  employee: EmployeeDetail;
  loading?: boolean;
}

export function ContactCard({ employee, loading = false }: ContactCardProps) {
  const contactInfo = [
    {
      label: "Email",
      value: employee.email,
      icon: Mail,
      type: "email"
    },
    {
      label: "Phone",
      value: employee.phoneNumber || "Not provided",
      icon: Phone,
      type: "phone"
    },
    {
      label: "Address",
      value: (employee as any).address || "Not provided",
      icon: MapPin,
      type: "address"
    },
    {
      label: "Emergency Contact",
      value: (employee as any).emergencyContact || "Not provided",
      icon: Phone,
      type: "emergency"
    }
  ];

  const accountInfo = [
    {
      label: "User ID",
      value: employee.id,
      icon: User
    },
    {
      label: "Role",
      value: employee.role,
      icon: Shield
    },
    {
      label: "Joined Date",
      value: employee.createdAt ? format(new Date(employee.createdAt), "MMM dd, yyyy") : "N/A",
      icon: Calendar
    },
    {
      label: "Last Updated",
      value: (employee as any).updatedAt ? format(new Date((employee as any).updatedAt), "MMM dd, yyyy") : "N/A",
      icon: Calendar
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Contact Details */}
            <div className="space-y-4">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                const isEmpty = item.value === "Not provided";

                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Icon className={cn(
                        "h-4 w-4",
                        isEmpty ? "text-muted-foreground" : "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      {item.type === "email" ? (
                        <a
                          href={`mailto:${item.value}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : item.type === "phone" && item.value !== "Not provided" ? (
                        <a
                          href={`tel:${item.value}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className={cn(
                          "text-sm",
                          isEmpty ? "text-muted-foreground italic" : "font-medium"
                        )}>
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Account Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Account Details</h4>
              {accountInfo.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      {item.label === "Role" ? (
                        <Badge variant="secondary" className="capitalize">
                          {item.value}
                        </Badge>
                      ) : item.label === "User ID" ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {item.value?.slice(0, 8).toUpperCase()}
                        </code>
                      ) : (
                        <span className="text-sm font-medium">{item.value}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Badge */}
            {employee.status && (
              <div className="pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      employee.status === "active"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    )}
                  >
                    {employee.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}