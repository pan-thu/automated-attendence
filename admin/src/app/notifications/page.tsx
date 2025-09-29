"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useNotifications } from "@/hooks/useNotifications";
import { callSendBulkNotification, callSendNotification } from "@/lib/firebase/functions";

const readFilters: Array<{ value: boolean | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: false, label: "Unread" },
  { value: true, label: "Read" },
];

const formatDateTime = (value: Date | null) => (value ? value.toLocaleString() : "—");

export default function NotificationsPage() {
  const {
    records,
    loading,
    error,
    search,
    setSearch,
    filters,
    setCategoryFilter,
    setTypeFilter,
    setIsReadFilter,
    setDateFilter,
    refresh,
  } = useNotifications();
  const [composeOpen, setComposeOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [formState, setFormState] = useState({
    userId: "",
    userIds: "",
    title: "",
    message: "",
    category: "",
    type: "",
  });
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoryLabel = useMemo(() => (filters.category && filters.category !== "all" ? filters.category : "All"), [
    filters.category,
  ]);
  const typeLabel = useMemo(() => (filters.type && filters.type !== "all" ? filters.type : "All"), [filters.type]);
  const readLabel = useMemo(
    () => readFilters.find((item) => item.value === filters.isRead)?.label ?? "All",
    [filters.isRead]
  );

  async function handleComposeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setComposeError(null);
    setComposeSuccess(null);

    const { userId, userIds, title, message, category, type } = formState;
    if (!title.trim() || !message.trim()) {
      setComposeError("Title and message are required.");
      setSubmitting(false);
      return;
    }

    try {
      if (bulkMode) {
        const splitIds = userIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        if (splitIds.length === 0) {
          setComposeError("Provide at least one user ID for bulk notifications.");
          setSubmitting(false);
          return;
        }
        await callSendBulkNotification({
          userIds: splitIds,
          title: title.trim(),
          message: message.trim(),
          category: category || undefined,
          type: type || undefined,
        });
        setComposeSuccess(`Bulk notification queued for ${splitIds.length} user${splitIds.length === 1 ? "" : "s"}.`);
      } else {
        if (!userId.trim()) {
          setComposeError("User ID is required for single notifications.");
          setSubmitting(false);
          return;
        }
        await callSendNotification({
          userId: userId.trim(),
          title: title.trim(),
          message: message.trim(),
          category: category || undefined,
          type: type || undefined,
        });
        setComposeSuccess("Notification queued successfully.");
      }

      setFormState({ userId: "", userIds: "", title: "", message: "", category: "", type: "" });
      setBulkMode(false);
      await refresh();
    } catch (err) {
      console.error("Failed to send notification", err);
      const messageText = err instanceof Error ? err.message : "Unable to send notification. Try again.";
      setComposeError(messageText);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Notifications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor announcements and alerts sent to employees, and dispatch targeted or bulk notifications.
              </p>
            </div>
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button type="button">Compose notification</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader
                  title="Compose Notification"
                  description="Send a targeted or bulk notification. All sends are logged in audit trails."
                />
                <form className="space-y-4" onSubmit={handleComposeSubmit}>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium">Audience</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBulkMode((prev) => !prev);
                        setComposeError(null);
                        setComposeSuccess(null);
                      }}
                    >
                      {bulkMode ? "Switch to single" : "Switch to bulk"}
                    </Button>
                  </div>

                  {bulkMode ? (
                    <div className="space-y-2">
                      <Label requiredMarker htmlFor="userIds">
                        User IDs (comma-separated)
                      </Label>
                      <Textarea
                        id="userIds"
                        value={formState.userIds}
                        onChange={(event) => setFormState((prev) => ({ ...prev, userIds: event.target.value }))}
                        placeholder="uid-1, uid-2, uid-3"
                        rows={3}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label requiredMarker htmlFor="userId">
                        User ID
                      </Label>
                      <Input
                        id="userId"
                        value={formState.userId}
                        onChange={(event) => setFormState((prev) => ({ ...prev, userId: event.target.value }))}
                        placeholder="Target user UID"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label requiredMarker htmlFor="title">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={formState.title}
                      onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Notification title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label requiredMarker htmlFor="message">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={formState.message}
                      onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                      placeholder="Short description or call to action"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category (optional)</Label>
                      <Input
                        id="category"
                        value={formState.category}
                        onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="attendance, leave, system, ..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type (optional)</Label>
                      <Input
                        id="type"
                        value={formState.type}
                        onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                        placeholder="info, success, warning, ..."
                      />
                    </div>
                  </div>

                  {composeError ? <p className="text-sm text-destructive">{composeError}</p> : null}
                  {composeSuccess ? <p className="text-sm text-emerald-600">{composeSuccess}</p> : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setComposeOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by employee, category, or message"
                  className="w-full sm:w-72"
                />
                <Input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    setDateFilter(event.target.value ? new Date(event.target.value) : null, filters.endDate ?? null)
                  }
                />
                <Input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().slice(0, 10) : ""}
                  onChange={(event) =>
                    setDateFilter(filters.startDate ?? null, event.target.value ? new Date(event.target.value) : null)
                  }
                />
                <Select
                  value={filters.category ?? "all"}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-36"
                >
                  <option value="all">All categories</option>
                  <option value="attendance">Attendance</option>
                  <option value="leave">Leave</option>
                  <option value="penalty">Penalty</option>
                  <option value="system">System</option>
                </Select>
                <Select value={filters.type ?? "all"} onChange={(event) => setTypeFilter(event.target.value)} className="w-36">
                  <option value="all">All types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </Select>
                <Select
                  value={filters.isRead ?? "all"}
                  onChange={(event) => setIsReadFilter(event.target.value === "all" ? "all" : event.target.value === "true")}
                  className="w-28"
                >
                  {readFilters.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setTypeFilter("all");
                    setIsReadFilter("all");
                    setDateFilter(null, null);
                  }}
                  disabled={
                    !search &&
                    (!filters.category || filters.category === "all") &&
                    (!filters.type || filters.type === "all") &&
                    (!filters.isRead || filters.isRead === "all") &&
                    !filters.startDate &&
                    !filters.endDate
                  }
                >
                  Reset filters
                </Button>
                <Button type="button" variant="outline" onClick={() => refresh()} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Read at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Loading notifications...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No notifications found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateTime(record.sentAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{record.userName ?? record.userId}</span>
                            <span className="text-xs text-muted-foreground">{record.userEmail ?? "No email"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{record.title}</span>
                            <span className="text-xs text-muted-foreground">{record.message}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{record.category ?? "—"}</TableCell>
                        <TableCell className="capitalize">{record.type ?? "—"}</TableCell>
                        <TableCell>{record.isRead ? "Read" : "Unread"}</TableCell>
                        <TableCell>{formatDateTime(record.readAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Showing {records.length} notification{records.length === 1 ? "" : "s"}. Filters: category {categoryLabel}, type {typeLabel},
              status {readLabel}.
            </p>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
