"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MoreHorizontal, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
  };
  type: "annual" | "sick" | "medical" | "maternity" | "paternity" | "unpaid" | "other";
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  attachments?: number;
}

interface LeaveRequestsProps {
  requests: LeaveRequest[];
  loading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const leaveTypeConfig = {
  full: { label: "Full Leave", color: "bg-blue-100 text-blue-700" },
  annual: { label: "Annual", color: "bg-blue-100 text-blue-700" },
  sick: { label: "Sick", color: "bg-red-100 text-red-700" },
  medical: { label: "Medical", color: "bg-purple-100 text-purple-700" },
  maternity: { label: "Maternity", color: "bg-pink-100 text-pink-700" },
  paternity: { label: "Paternity", color: "bg-indigo-100 text-indigo-700" },
  unpaid: { label: "Unpaid", color: "bg-gray-100 text-gray-700" },
  other: { label: "Other", color: "bg-yellow-100 text-yellow-700" },
};

const statusConfig = {
  pending: { icon: AlertCircle, color: "text-yellow-600" },
  approved: { icon: CheckCircle, color: "text-green-600" },
  rejected: { icon: XCircle, color: "text-red-600" },
};

export function LeaveRequests({
  requests,
  loading = false,
  onApprove,
  onReject,
}: LeaveRequestsProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (onApprove) {
      setProcessingId(id);
      try {
        await onApprove(id);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (id: string) => {
    if (onReject) {
      setProcessingId(id);
      try {
        await onReject(id);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pending Leave Requests</CardTitle>
          <CardDescription>
            {pendingRequests.length} request{pendingRequests.length !== 1 ? "s" : ""} awaiting approval
          </CardDescription>
        </div>
        <Link href="/leaves">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending leave requests</p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.employee.avatar} alt={request.employee.name} />
                    <AvatarFallback>
                      {request.employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{request.employee.name}</p>
                      <Badge variant="secondary" className={cn("text-xs", leaveTypeConfig[request.type].color)}>
                        {leaveTypeConfig[request.type].label}
                      </Badge>
                      {request.attachments && request.attachments > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {request.attachments} attachment{request.attachments !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(request.startDate, "MMM d")} - {format(request.endDate, "MMM d")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(request.requestedAt, "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {request.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/leaves/${request.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/employees/${request.employee.id}`}>
                          View Employee
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}