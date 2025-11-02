"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  UserCheck,
  UserX,
  ArrowLeft,
  Building,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { EmployeeDetail } from "@/types";

interface ProfileHeaderProps {
  employee: EmployeeDetail;
  onEdit?: () => void;
  onStatusToggle?: () => void;
  loading?: boolean;
}

export function ProfileHeader({
  employee,
  onEdit,
  onStatusToggle,
  loading = false
}: ProfileHeaderProps) {
  const StatusIcon = employee.status === "active" ? UserCheck : UserX;
  const isActive = employee.status === "active";

  return (
    <div className="space-y-6">
      {/* Back Button and Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
          {onStatusToggle && (
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={onStatusToggle}
              disabled={loading}
            >
              <StatusIcon className="h-4 w-4 mr-2" />
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(employee.fullName)}&background=random&size=200`}
                    alt={employee.fullName}
                  />
                  <AvatarFallback className="text-lg">
                    {employee.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute bottom-0 right-0 h-6 w-6 rounded-full border-4 border-white",
                    isActive ? "bg-green-500" : "bg-gray-400"
                  )}
                  title={isActive ? "Active" : "Inactive"}
                />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-sm",
                  isActive
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{employee.fullName}</h1>
                <p className="text-sm text-muted-foreground">
                  Employee ID: {employee.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Work Info */}
                <div className="space-y-2">
                  {employee.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.department}</span>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.position}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Badge */}
              {employee.role && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Badge variant="secondary" className="capitalize">
                    {employee.role}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}