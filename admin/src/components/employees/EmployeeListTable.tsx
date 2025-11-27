"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-radix";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeTableSkeleton } from "./EmployeeTableSkeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EmployeeSummary, EmployeeStatus } from "@/types";

interface EmployeeListTableProps {
  employees: EmployeeSummary[];
  loading?: boolean;
  error?: string | null;
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onStatusToggle?: (id: string, newStatus: EmployeeStatus) => void;
  onExport?: () => void;
}

type SortField = "fullName" | "email" | "department" | "position" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle
  },
  inactive: {
    label: "Inactive",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: XCircle
  }
};

const departments = [
  "All Departments",
  "Engineering",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Product",
  "Design"
];

export function EmployeeListTable({
  employees,
  loading = false,
  error = null,
  onCreateClick,
  onEditClick,
  onStatusToggle,
  onExport
}: EmployeeListTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("fullName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.fullName.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== "All Departments") {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      // Convert dates for comparison
      if (sortField === "createdAt") {
        if (a.createdAt instanceof Date) {
          aVal = a.createdAt.getTime();
        } else if (typeof a.createdAt === 'string' || typeof a.createdAt === 'number') {
          aVal = new Date(a.createdAt).getTime();
        } else {
          aVal = 0;
        }

        if (b.createdAt instanceof Date) {
          bVal = b.createdAt.getTime();
        } else if (typeof b.createdAt === 'string' || typeof b.createdAt === 'number') {
          bVal = new Date(b.createdAt).getTime();
        } else {
          bVal = 0;
        }
      }

      // Compare
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [employees, searchQuery, statusFilter, departmentFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const toggleRowSelection = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === paginatedEmployees.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedEmployees.map(emp => emp.id)));
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc"
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (loading) {
    return <EmployeeTableSkeleton />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRows.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRows(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
            {onCreateClick && (
              <Button
                size="sm"
                onClick={onCreateClick}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedRows.size === paginatedEmployees.length && paginatedEmployees.length > 0}
                      onCheckedChange={toggleAllSelection}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("fullName")}
                  >
                    <div className="flex items-center">
                      Employee
                      {getSortIcon("fullName")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      Email
                      {getSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center">
                      Department
                      {getSortIcon("department")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("position")}
                  >
                    <div className="flex items-center">
                      Position
                      {getSortIcon("position")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Joined
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Loading employees...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p className="text-sm font-medium">No employees found</p>
                        <p className="text-xs text-muted-foreground">
                          {searchQuery || statusFilter !== "all" || departmentFilter !== "All Departments"
                            ? "Try adjusting your filters"
                            : "Get started by adding your first employee"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((employee) => {
                    const StatusIcon = statusConfig[employee.status].icon;
                    return (
                      <TableRow
                        key={employee.id}
                        className={cn(
                          "hover:bg-gray-50/50 transition-colors",
                          selectedRows.has(employee.id) && "bg-blue-50/50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(employee.id)}
                            onCheckedChange={() => toggleRowSelection(employee.id)}
                            aria-label={`Select ${employee.fullName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={employee.photoURL || undefined}
                                alt={employee.fullName}
                              />
                              <AvatarFallback className="bg-blue-600 text-white">
                                {employee.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.fullName}</p>
                              <p className="text-xs text-muted-foreground">ID: {employee.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {employee.department || "Not Assigned"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {employee.position || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusConfig[employee.status].color}
                          >
                            {statusConfig[employee.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {employee.createdAt
                            ? format(employee.createdAt, "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {employee.role !== "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/employees/${employee.id}`} className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Detail
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredEmployees.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of{" "}
              {filteredEmployees.length} employees
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}