"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreVertical,
  Eye,
  DollarSign,
  Calendar,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
  month: string;
}

interface PenaltyTableProps {
  penalties: Penalty[];
  loading?: boolean;
  selectedPenalties: string[];
  onSelectPenalty: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewDetails: (penalty: Penalty) => void;
  onWaive?: (penalty: Penalty) => void;
  onMarkPaid?: (penalty: Penalty) => void;
}

const violationTypeConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  late: { label: "Late", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  early_leave: { label: "Early Leave", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertCircle },
  absent: { label: "Absent", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  half_day: { label: "Half Day", color: "bg-purple-100 text-purple-700 border-purple-200", icon: AlertTriangle },
  multiple: { label: "Multiple", color: "bg-gray-100 text-gray-700 border-gray-200", icon: AlertTriangle }
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Active", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  waived: { label: "Waived", color: "bg-green-100 text-green-700 border-green-200", icon: Shield },
  paid: { label: "Paid", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle }
};

export function PenaltyTable({
  penalties,
  loading = false,
  selectedPenalties,
  onSelectPenalty,
  onSelectAll,
  onViewDetails,
  onWaive,
  onMarkPaid
}: PenaltyTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = penalties.length > 0 && selectedPenalties.length === penalties.length;

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-8">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (penalties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center rounded-lg border bg-white">
        <DollarSign className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-900">No penalties found</p>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
              />
            </TableHead>
            <TableHead className="w-40">Date</TableHead>
            <TableHead className="w-64">Employee</TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead className="w-24">Count</TableHead>
            <TableHead className="w-32">Amount</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-32">Due Date</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {penalties.map((penalty) => {
            const isSelected = selectedPenalties.includes(penalty.id);
            const isHovered = hoveredRow === penalty.id;
            const daysUntilDue = penalty.dueDate ? differenceInDays(penalty.dueDate, new Date()) : null;
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && penalty.status === "active";
            const isUrgent = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && penalty.status === "active";

            const violationConfig = violationTypeConfig[penalty.violationType] || violationTypeConfig.multiple;
            const statusInfo = statusConfig[penalty.status] || statusConfig.active;
            const StatusIcon = statusInfo.icon;
            const ViolationIcon = violationConfig.icon;

            return (
              <TableRow
                key={penalty.id}
                className={cn(
                  "transition-colors",
                  isSelected && "bg-blue-50",
                  isHovered && "bg-gray-50",
                  isOverdue && "border-l-4 border-l-red-500",
                  isUrgent && "border-l-4 border-l-orange-500"
                )}
                onMouseEnter={() => setHoveredRow(penalty.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Checkbox */}
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectPenalty(penalty.id)}
                  />
                </TableCell>

                {/* Date */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {format(penalty.issuedAt, "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(penalty.month + "-01"), "MMM yyyy")}
                    </p>
                  </div>
                </TableCell>

                {/* Employee */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={penalty.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(penalty.userName)}&background=random`}
                        alt={penalty.userName}
                      />
                      <AvatarFallback>
                        {penalty.userName.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{penalty.userName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{penalty.userEmail}</span>
                        {penalty.department && (
                          <>
                            <span>•</span>
                            <span>{penalty.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Violation Type */}
                <TableCell>
                  <Badge variant="secondary" className={cn("gap-1", violationConfig.color)}>
                    <ViolationIcon className="h-3 w-3" />
                    {violationConfig.label}
                  </Badge>
                </TableCell>

                {/* Violation Count */}
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {penalty.violationCount}
                  </Badge>
                </TableCell>

                {/* Amount */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold">
                      {penalty.amount.toFixed(2)}
                    </span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={cn("gap-1 text-xs", statusInfo.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                        Overdue
                      </Badge>
                    )}
                    {isUrgent && (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                        Due Soon
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Due Date */}
                <TableCell>
                  {penalty.dueDate ? (
                    <div className="space-y-1">
                      <p className="text-sm">
                        {format(penalty.dueDate, "MMM dd")}
                      </p>
                      {daysUntilDue !== null && penalty.status === "active" && (
                        <p className={cn(
                          "text-xs",
                          isOverdue ? "text-red-600" : isUrgent ? "text-orange-600" : "text-gray-500"
                        )}>
                          {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onViewDetails(penalty)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {penalty.status === "active" && onWaive && (
                        <DropdownMenuItem onClick={() => onWaive(penalty)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Waive Penalty
                        </DropdownMenuItem>
                      )}
                      {penalty.status === "active" && onMarkPaid && (
                        <DropdownMenuItem onClick={() => onMarkPaid(penalty)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Bulk Actions Bar */}
      {selectedPenalties.length > 0 && (
        <div className="sticky bottom-0 bg-blue-50 border-t border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {selectedPenalties.length} penalty{selectedPenalties.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Export Selected
              </Button>
              {onWaive && (
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Bulk Waive
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
