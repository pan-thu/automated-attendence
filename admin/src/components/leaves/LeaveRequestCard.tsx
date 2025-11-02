"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Building,
  Mail
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  avatar?: string;
  leaveType: "annual" | "sick" | "medical" | "maternity" | "paternity" | "unpaid" | "other";
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  appliedAt: Date;
  attachments?: Array<{ id: string; name: string; url: string }>;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewerNotes?: string;
  leaveBalance?: { used: number; total: number };
}

interface LeaveRequestCardProps {
  request: LeaveRequest;
  onApprove?: (id: string, notes: string) => void;
  onReject?: (id: string, notes: string) => void;
  onViewDetails?: (request: LeaveRequest) => void;
  isProcessing?: boolean;
}

const leaveTypeConfig = {
  full: { label: "Full Leave", color: "bg-blue-100 text-blue-700", icon: Calendar },
  annual: { label: "Annual Leave", color: "bg-blue-100 text-blue-700", icon: Calendar },
  sick: { label: "Sick Leave", color: "bg-red-100 text-red-700", icon: AlertCircle },
  medical: { label: "Medical Leave", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  maternity: { label: "Maternity Leave", color: "bg-pink-100 text-pink-700", icon: User },
  paternity: { label: "Paternity Leave", color: "bg-indigo-100 text-indigo-700", icon: User },
  unpaid: { label: "Unpaid Leave", color: "bg-gray-100 text-gray-700", icon: XCircle },
  other: { label: "Other Leave", color: "bg-yellow-100 text-yellow-700", icon: FileText }
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle }
};

export function LeaveRequestCard({
  request,
  onApprove,
  onReject,
  onViewDetails,
  isProcessing = false
}: LeaveRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const leaveConfig = leaveTypeConfig[request.leaveType];
  const statusInfo = statusConfig[request.status];
  const StatusIcon = statusInfo.icon;
  const LeaveIcon = leaveConfig.icon;

  const daysFromNow = differenceInDays(request.startDate, new Date());
  const isUrgent = daysFromNow <= 2 && daysFromNow >= 0 && request.status === "pending";

  const handleApprove = () => {
    if (onApprove) {
      onApprove(request.id, reviewNotes);
      setReviewNotes("");
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(request.id, reviewNotes);
      setReviewNotes("");
    }
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isUrgent && "border-orange-400 border-2"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Employee Info */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={request.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.userName)}&background=random`}
                alt={request.userName}
              />
              <AvatarFallback>
                {request.userName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.userName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>{request.userEmail}</span>
                {request.department && (
                  <>
                    <span>•</span>
                    <Building className="h-3 w-3" />
                    <span>{request.department}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isUrgent && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                Urgent
              </Badge>
            )}
            <Badge variant="outline" className={cn("gap-1", statusInfo.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Leave Type and Dates */}
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="secondary" className={cn("gap-1", leaveConfig.color)}>
            <LeaveIcon className="h-3 w-3" />
            {leaveConfig.label}
          </Badge>
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(request.startDate, "MMM dd")} - {format(request.endDate, "MMM dd, yyyy")}</span>
          </div>
          <Badge variant="outline">
            {request.totalDays} day{request.totalDays > 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Reason</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.reason}
          </p>
        </div>

        {/* Attachments */}
        {request.attachments && request.attachments.length > 0 && (
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {request.attachments.length} attachment{request.attachments.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Leave Balance */}
        {request.leaveBalance && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">Leave Balance After Approval</span>
            <span className="text-sm font-medium">
              {request.leaveBalance.total - request.leaveBalance.used - request.totalDays} / {request.leaveBalance.total} days
            </span>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Actions
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Actions
            </>
          )}
        </Button>

        {/* Expanded Actions */}
        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Applied Date */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Applied on</span>
              <span>{format(request.appliedAt, "MMM dd, yyyy 'at' hh:mm a")}</span>
            </div>

            {/* Review Notes Input (for pending requests) */}
            {request.status === "pending" && (onApprove || onReject) && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Review Notes (Optional)</label>
                  <Textarea
                    placeholder="Add notes for the employee..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {onApprove && (
                    <Button
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Existing Review Notes (for reviewed requests) */}
            {request.reviewerNotes && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Review Notes</p>
                <p className="text-sm text-muted-foreground">{request.reviewerNotes}</p>
                {request.reviewedBy && request.reviewedAt && (
                  <p className="text-xs text-muted-foreground">
                    By {request.reviewedBy} on {format(request.reviewedAt, "MMM dd, yyyy")}
                  </p>
                )}
              </div>
            )}

            {/* View Details Button */}
            {onViewDetails && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onViewDetails(request)}
              >
                View Full Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}