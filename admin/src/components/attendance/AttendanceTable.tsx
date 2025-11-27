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
import { TimeDisplay } from "./TimeDisplay";
import { AttendanceTableSkeleton } from "./AttendanceTableSkeleton";
import {
  MoreVertical,
  Eye,
  Edit,
  Download,
  Calendar,
  User,
  Building,
  Clock,
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: Date;
  employee: {
    uid: string;
    name: string;
    email: string;
    employeeId: string;
    department: string;
    avatar?: string;
  };
  checks: {
    checkIn: {
      time: Date | null;
      status: "on_time" | "late" | null;
      location?: { latitude: number; longitude: number };
      isMocked?: boolean;
    };
    break?: {
      out: Date | null;
      in: Date | null;
      duration?: number;
    };
    checkOut: {
      time: Date | null;
      status: "on_time" | "early" | null;
      location?: { latitude: number; longitude: number };
    };
  };
  status: "present" | "absent" | "half_day" | "late" | "early_leave" | "on_leave" | "pending";
  workDuration?: number;
  source: "app" | "manual" | "system";
  notes?: string;
  modifiedBy?: string;
  modifiedAt?: Date;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading?: boolean;
  selectedRecords: string[];
  onSelectRecord: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewDetails: (record: AttendanceRecord) => void;
  onEdit: (record: AttendanceRecord) => void;
  onExportRecord: (record: AttendanceRecord) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  present: {
    label: "Present",
    color: "bg-green-100 text-green-700 border-green-200"
  },
  absent: {
    label: "Absent",
    color: "bg-red-100 text-red-700 border-red-200"
  },
  half_day: {
    label: "Half Day",
    color: "bg-purple-100 text-purple-700 border-purple-200"
  },
  late: {
    label: "Late",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200"
  },
  early_leave: {
    label: "Early Leave",
    color: "bg-orange-100 text-orange-700 border-orange-200"
  },
  on_leave: {
    label: "On Leave",
    color: "bg-blue-100 text-blue-700 border-blue-200"
  },
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-700 border-gray-200"
  }
};

const sourceIcons = {
  app: "📱",
  manual: "✏️",
  system: "⚙️"
};

export function AttendanceTable({
  records,
  loading = false,
  selectedRecords,
  onSelectRecord,
  onSelectAll,
  onViewDetails,
  onEdit,
  onExportRecord
}: AttendanceTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = records.length > 0 && selectedRecords.length === records.length;
  const someSelected = selectedRecords.length > 0 && selectedRecords.length < records.length;

  const calculateWorkHours = (checks: AttendanceRecord["checks"]) => {
    if (!checks.checkIn.time || !checks.checkOut.time) return null;

    const start = checks.checkIn.time.getTime();
    const end = checks.checkOut.time.getTime();
    const breakDuration = checks.break?.duration || 0;

    const totalMinutes = (end - start) / (1000 * 60) - breakDuration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <AttendanceTableSkeleton />;
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-900">No attendance records found</p>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or date range</p>
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
            <TableHead className="w-32">Check-in</TableHead>
            <TableHead className="w-32">Break</TableHead>
            <TableHead className="w-32">Check-out</TableHead>
            <TableHead className="w-28">Hours</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-20 text-center">Source</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const isSelected = selectedRecords.includes(record.id);
            const isHovered = hoveredRow === record.id;
            const workHours = calculateWorkHours(record.checks);

            return (
              <TableRow
                key={record.id}
                className={cn(
                  "transition-colors",
                  isSelected && "bg-blue-50",
                  isHovered && "bg-gray-50"
                )}
                onMouseEnter={() => setHoveredRow(record.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Checkbox */}
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectRecord(record.id)}
                  />
                </TableCell>

                {/* Date */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {format(record.date, "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(record.date, "EEEE")}
                    </p>
                  </div>
                </TableCell>

                {/* Employee */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={record.employee.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(record.employee.name)}&background=random`}
                        alt={record.employee.name}
                      />
                      <AvatarFallback>
                        {record.employee.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{record.employee.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{record.employee.employeeId}</span>
                        {record.employee.department && (
                          <>
                            <span>•</span>
                            <span>{record.employee.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Check-in */}
                <TableCell>
                  <TimeDisplay
                    time={record.checks.checkIn.time}
                    status={record.checks.checkIn.status}
                    location={record.checks.checkIn.location}
                    isMocked={record.checks.checkIn.isMocked}
                  />
                </TableCell>

                {/* Break */}
                <TableCell>
                  {record.checks.break ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-500">Out:</span>
                        <span className="font-medium">
                          {record.checks.break.out ? format(record.checks.break.out, "hh:mm a") : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-500">In:</span>
                        <span className="font-medium">
                          {record.checks.break.in ? format(record.checks.break.in, "hh:mm a") : "—"}
                        </span>
                      </div>
                      {record.checks.break.duration && (
                        <p className="text-xs text-gray-500">
                          {record.checks.break.duration} min
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </TableCell>

                {/* Check-out */}
                <TableCell>
                  {!record.checks.checkOut.time && record.checks.checkIn.time ? (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">
                        Not checked out
                      </span>
                    </div>
                  ) : (
                    <TimeDisplay
                      time={record.checks.checkOut.time}
                      status={record.checks.checkOut.status}
                      location={record.checks.checkOut.location}
                    />
                  )}
                </TableCell>

                {/* Work Hours */}
                <TableCell>
                  {workHours ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium">{workHours}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusConfig[record.status].color)}
                  >
                    {statusConfig[record.status].label}
                  </Badge>
                </TableCell>

                {/* Source */}
                <TableCell className="text-center">
                  <div className="inline-flex items-center justify-center">
                    <span className="text-lg" title={record.source}>
                      {sourceIcons[record.source]}
                    </span>
                  </div>
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
                      <DropdownMenuItem onClick={() => onViewDetails(record)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(record)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Record
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExportRecord(record)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Bulk Actions Bar */}
      {selectedRecords.length > 0 && (
        <div className="sticky bottom-0 bg-blue-50 border-t border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {selectedRecords.length} record{selectedRecords.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}