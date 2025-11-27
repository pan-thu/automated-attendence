"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Building,
  Mail,
  ChevronDown,
  ChevronUp,
  Shield
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Penalty {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  avatar?: string;
  violationType: "late" | "early_leave" | "absent" | "half_day" | "multiple";
  violationCount: number;
  violationDates: Date[];
  amount: number;
  currency: string;
  status: "active" | "waived" | "paid";
  issuedAt: Date;
  dueDate?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  waivedAt?: Date;
  waivedBy?: string;
  waiverReason?: string;
  paidAt?: Date;
  paymentMethod?: string;
  notes?: string;
  month: string; // e.g., "2024-01"
}

interface PenaltyCardProps {
  penalty: Penalty;
  onWaive?: (id: string, reason: string) => void;
  onMarkPaid?: (id: string, method: string) => void;
  onViewDetails?: (penalty: Penalty) => void;
  isProcessing?: boolean;
}

const violationTypeConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  late: { label: "Late Arrival", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  early_leave: { label: "Early Leave", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  absent: { label: "Absent", color: "bg-red-100 text-red-700", icon: XCircle },
  half_day: { label: "Half Day", color: "bg-purple-100 text-purple-700", icon: AlertTriangle },
  multiple: { label: "Multiple Violations", color: "bg-gray-100 text-gray-700", icon: AlertTriangle }
};

const defaultViolationConfig = { label: "Violation", color: "bg-gray-100 text-gray-700", icon: AlertTriangle };

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Active", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  waived: { label: "Waived", color: "bg-green-100 text-green-700 border-green-200", icon: Shield },
  paid: { label: "Paid", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle }
};

const defaultStatusConfig = { label: "Unknown", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock };

export function PenaltyCard({
  penalty,
  onWaive,
  onMarkPaid,
  onViewDetails,
  isProcessing = false
}: PenaltyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [waiverReason, setWaiverReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("payroll_deduction");

  const violationConfig = violationTypeConfig[penalty.violationType] || defaultViolationConfig;
  const statusInfo = statusConfig[penalty.status] || defaultStatusConfig;
  const StatusIcon = statusInfo.icon;
  const ViolationIcon = violationConfig.icon;

  const daysUntilDue = penalty.dueDate ? differenceInDays(penalty.dueDate, new Date()) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && penalty.status === "active";
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && penalty.status === "active";

  const handleWaive = () => {
    if (onWaive && waiverReason.trim()) {
      onWaive(penalty.id, waiverReason);
      setWaiverReason("");
    }
  };

  const handleMarkPaid = () => {
    if (onMarkPaid) {
      onMarkPaid(penalty.id, paymentMethod);
    }
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isOverdue && "border-red-400 border-2",
      isUrgent && "border-orange-400 border-2"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Employee Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={penalty.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(penalty.userName)}&background=random`}
                alt={penalty.userName}
              />
              <AvatarFallback>
                {penalty.userName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{penalty.userName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{penalty.userEmail}</span>
                {penalty.department && (
                  <>
                    <span className="flex-shrink-0">•</span>
                    <Building className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{penalty.department}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status and Urgency Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOverdue && (
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                Overdue
              </Badge>
            )}
            {isUrgent && (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                Due Soon
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
        {/* Violation Type and Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={cn("gap-1", violationConfig.color)}>
              <ViolationIcon className="h-3 w-3" />
              {violationConfig.label}
            </Badge>
            <Badge variant="outline">
              {penalty.violationCount} violation{penalty.violationCount > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {penalty.currency} {penalty.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Period and Dates */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Period: {format(new Date(penalty.month + "-01"), "MMMM yyyy")}</span>
          </div>
          {penalty.dueDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Due: {format(penalty.dueDate, "MMM dd, yyyy")}</span>
            </div>
          )}
        </div>

        {/* Violation Dates Preview */}
        {penalty.violationDates.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Violation Dates</p>
            <div className="flex flex-wrap gap-1">
              {penalty.violationDates.slice(0, 3).map((date, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {format(date, "MMM dd")}
                </Badge>
              ))}
              {penalty.violationDates.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{penalty.violationDates.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {penalty.notes && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Notes</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {penalty.notes}
            </p>
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
            {/* Issue Date */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Issued on</span>
              <span>{format(penalty.issuedAt, "MMM dd, yyyy 'at' hh:mm a")}</span>
            </div>

            {/* Status-specific Information */}
            {penalty.status === "waived" && penalty.waivedAt && (
              <div className="space-y-1 p-2 bg-green-50 rounded-md">
                <p className="text-sm font-medium text-green-900">Waived</p>
                <p className="text-xs text-green-700">
                  By {penalty.waivedBy} on {format(penalty.waivedAt, "MMM dd, yyyy")}
                </p>
                {penalty.waiverReason && (
                  <p className="text-xs text-green-600 italic">"{penalty.waiverReason}"</p>
                )}
              </div>
            )}

            {penalty.status === "paid" && penalty.paidAt && (
              <div className="space-y-1 p-2 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900">Paid</p>
                <p className="text-xs text-gray-700">
                  On {format(penalty.paidAt, "MMM dd, yyyy")} via {penalty.paymentMethod?.replace("_", " ")}
                </p>
              </div>
            )}

            {/* Action Inputs (for active penalties) */}
            {penalty.status === "active" && (
              <>
                {/* Waiver Section */}
                {onWaive && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Waive Penalty</label>
                    <Textarea
                      placeholder="Provide reason for waiving this penalty..."
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                      rows={2}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleWaive}
                      disabled={isProcessing || !waiverReason.trim()}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Waive Penalty
                    </Button>
                  </div>
                )}

                {/* Mark as Paid Section */}
                {onMarkPaid && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mark as Paid</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="payroll_deduction">Payroll Deduction</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                    <Button
                      className="w-full"
                      onClick={handleMarkPaid}
                      disabled={isProcessing}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* View Details Button */}
            {onViewDetails && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onViewDetails(penalty)}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Full Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}