export interface UserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export type AttendanceSummary = {
  present: number;
  absent: number;
  onLeave: number;
  halfDay: number;
  total: number;
};

export interface DashboardSummary {
  totalEmployees: number;
  attendance: AttendanceSummary;
  pendingLeaves: number;
  activeViolations: number;
  recentViolations: ViolationSummary[];
}

export type ViolationSummary = {
  id: string;
  violationType: string;
  createdAt: Date | null;
  monthlyCount?: number;
  penaltyTriggered?: boolean;
};

export type EmployeeStatus = "active" | "inactive";

export interface LeaveBalances {
  [key: string]: number;
}

export interface EmployeeSummary {
  id: string;
  fullName: string;
  email: string;
  department?: string | null;
  position?: string | null;
  status: EmployeeStatus;
  photoURL?: string | null;
  role?: string | null;
  phoneNumber?: string | null;
  leaveBalances?: LeaveBalances;
  createdAt?: Date | null;
}

export interface EmployeeDetail extends EmployeeSummary {
  phoneNumber?: string | null;
  isActive: boolean;
  leaveBalances: LeaveBalances;
  role?: string | null;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  password: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: LeaveBalances;
}

export interface UpdateEmployeePayload {
  uid: string;
  fullName?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: LeaveBalances;
}

export interface ToggleUserStatusPayload {
  uid: string;
  enable: boolean;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "on_leave"
  | "late"
  | "early_leave"
  | "pending";

export interface AttendanceRecordSummary {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: AttendanceStatus | string;
  attendanceDate: Date | null;
  isManualEntry?: boolean;
  notes?: string | null;
  checks?: Array<{
    check: string;
    status: string | null;
    timestamp: Date | null;
  }>;
}

export interface AttendanceFilter {
  startDate?: Date | null;
  endDate?: Date | null;
  status?: AttendanceStatus | "all";
  userId?: string;
}

export interface ManualAttendancePayload {
  userId: string;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus | string;
  reason: string;
  notes?: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequestSummary {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  leaveType: string;
  status: LeaveStatus;
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  appliedAt: Date | null;
  notes?: string | null; // Maps to 'reason' field in Firestore
  reviewerNotes?: string | null;
  attachmentId?: string | null;
}

export interface LeaveFilter {
  status?: LeaveStatus | "all";
  userId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface LeaveApprovalPayload {
  requestId: string;
  action: "approve" | "reject";
  notes?: string;
}

export interface CompanySettings {
  companyName?: string;
  timezone?: string;
  workplace_center?: { latitude: number; longitude: number } | null;
  workplace_radius?: number | null;
  workplaceAddress?: string | null;
  timeWindows?: Record<string, { label: string; start: string; end: string }>;
  gracePeriods?: Record<string, number>; // Per-check grace periods (check1, check2, check3)
  penaltyRules?: {
    violationThresholds: Record<string, number>; // Per violation type thresholds
    amounts: Record<string, number>; // Penalty amounts per violation type
  } | null;
  leavePolicy?: Record<string, number>;
  workingDays?: Record<string, boolean>;
  holidays?: string[];
  geoFencingEnabled?: boolean;
  maxLeaveAttachmentSizeMb?: number | null;
  allowedLeaveAttachmentTypes?: string[];
  leaveAttachmentRequiredTypes?: string[];
  updatedAt?: Date | null;
  updatedBy?: string | null;
}

export interface AttendanceReportRecord {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  attendanceDate: Date | null;
  status: AttendanceStatus | string;
  department?: string | null;
  position?: string | null;
  isManualEntry?: boolean;
  reason?: string | null;
  notes?: string | null;
}

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  userId?: string;
  department?: string;
}

export type PenaltyStatus = "active" | "waived" | "paid";

export interface PenaltyRecord {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  violationType: string;
  amount: number;
  status: PenaltyStatus;
  dateIncurred: Date | null;
  waivedAt?: Date | null;
  waivedReason?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  notes?: string | null;
}

export interface PenaltyFilter {
  status?: PenaltyStatus | "all";
  userId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  title: string;
  message: string;
  category?: string | null;
  type?: string | null;
  isRead: boolean;
  sentAt: Date | null;
  readAt?: Date | null;
  relatedId?: string | null;
  relatedType?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationFilter {
  category?: string | "all";
  type?: string | "all";
  userId?: string;
  isRead?: boolean | "all";
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  status: string;
  performedBy: string;
  performedByEmail?: string | null;
  timestamp: Date | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface AuditLogFilter {
  action?: string | "all";
  resource?: string | "all";
  performedBy?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}