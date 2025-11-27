"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Send,
  X,
  Users,
  User,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (notification: any) => Promise<void>;
  employees?: Array<{ id: string; name: string; email: string; department?: string }>;
}

const notificationTypes = [
  { value: "info", label: "Information", icon: Info, color: "bg-blue-100 text-blue-700" },
  { value: "success", label: "Success", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  { value: "warning", label: "Warning", icon: AlertCircle, color: "bg-yellow-100 text-yellow-700" },
  { value: "error", label: "Error", icon: XCircle, color: "bg-red-100 text-red-700" }
];

const priorityLevels = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-600" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-600" }
];

export function NotificationComposer({
  open,
  onClose,
  onSend,
  employees = []
}: NotificationComposerProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    targetType: "all",
    targetUsers: [] as string[],
    targetDepartments: [] as string[],
    channels: {
      inApp: true,
      email: false,
      push: false,
      sms: false
    },
    actionUrl: "",
    actionLabel: "",
    scheduledFor: ""
  });

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      return;
    }

    if (formData.targetType === "specific" && formData.targetUsers.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    if (formData.targetType === "department" && formData.targetDepartments.length === 0) {
      setError("Please select at least one department");
      return;
    }

    const hasChannel = Object.values(formData.channels).some(v => v);
    if (!hasChannel) {
      setError("Please select at least one notification channel");
      return;
    }

    setSending(true);
    try {
      await onSend({
        ...formData,
        channels: Object.entries(formData.channels)
          .filter(([_, enabled]) => enabled)
          .map(([channel]) => channel)
      });

      // Reset form
      setFormData({
        title: "",
        message: "",
        type: "info",
        priority: "medium",
        targetType: "all",
        targetUsers: [],
        targetDepartments: [],
        channels: { inApp: true, email: false, push: false, sms: false },
        actionUrl: "",
        actionLabel: "",
        scheduledFor: ""
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      targetUsers: prev.targetUsers.includes(userId)
        ? prev.targetUsers.filter(id => id !== userId)
        : [...prev.targetUsers, userId]
    }));
  };

  const handleDepartmentToggle = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      targetDepartments: prev.targetDepartments.includes(dept)
        ? prev.targetDepartments.filter(d => d !== dept)
        : [...prev.targetDepartments, dept]
    }));
  };

  const getSelectedType = () => notificationTypes.find(t => t.value === formData.type);
  const getSelectedPriority = () => priorityLevels.find(p => p.value === formData.priority);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Notification</DialogTitle>
          <DialogDescription>
            Create and send notifications to employees
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Message */}
          <div className="space-y-4">
            <div>
              <Label requiredMarker htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                required
              />
            </div>

            <div>
              <Label requiredMarker htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Notification message"
                rows={4}
                required
              />
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {notificationTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-colors",
                        isSelected
                          ? type.color + " border-current"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Priority</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {priorityLevels.map((priority) => {
                  const isSelected = formData.priority === priority.value;
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: priority.value })}
                      className={cn(
                        "p-2 rounded-md border transition-colors text-sm",
                        isSelected
                          ? priority.color + " border-current"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {priority.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <Label>Target Audience</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    value="all"
                    checked={formData.targetType === "all"}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  />
                  <span className="text-sm">All Employees</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    value="specific"
                    checked={formData.targetType === "specific"}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  />
                  <span className="text-sm">Specific Employees</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetType"
                    value="department"
                    checked={formData.targetType === "department"}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  />
                  <span className="text-sm">By Department</span>
                </label>
              </div>

              {/* Specific Employees Selection */}
              {formData.targetType === "specific" && (
                <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <label key={employee.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.targetUsers.includes(employee.id)}
                          onCheckedChange={() => handleUserToggle(employee.id)}
                        />
                        <span className="text-sm">
                          {employee.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({employee.email})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Department Selection */}
              {formData.targetType === "department" && (
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <Badge
                      key={dept}
                      variant={formData.targetDepartments.includes(dept!) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleDepartmentToggle(dept!)}
                    >
                      {dept}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <Label>Notification Channels</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={formData.channels.inApp}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, channels: { ...formData.channels, inApp: !!checked } })
                  }
                />
                <Bell className="h-4 w-4" />
                <span className="text-sm">In-App</span>
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={formData.channels.email}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, channels: { ...formData.channels, email: !!checked } })
                  }
                />
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={formData.channels.push}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, channels: { ...formData.channels, push: !!checked } })
                  }
                />
                <Smartphone className="h-4 w-4" />
                <span className="text-sm">Push</span>
              </label>

              <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={formData.channels.sms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, channels: { ...formData.channels, sms: !!checked } })
                  }
                />
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">SMS</span>
              </label>
            </div>
          </div>

          {/* Action URL (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="actionUrl">Action URL (Optional)</Label>
              <Input
                id="actionUrl"
                type="url"
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                placeholder="https://example.com/action"
              />
            </div>
            <div>
              <Label htmlFor="actionLabel">Action Label (Optional)</Label>
              <Input
                id="actionLabel"
                value={formData.actionLabel}
                onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                placeholder="View Details"
              />
            </div>
          </div>

          {/* Schedule (Optional) */}
          <div>
            <Label htmlFor="scheduledFor">Schedule For (Optional)</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to send immediately
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          <div className="p-4 bg-muted/50 rounded-md space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <div className="flex items-center gap-2">
              {getSelectedType() && (
                <Badge className={getSelectedType()!.color}>
                  {getSelectedType()!.label}
                </Badge>
              )}
              {getSelectedPriority() && (
                <Badge className={getSelectedPriority()!.color}>
                  {getSelectedPriority()!.label}
                </Badge>
              )}
            </div>
            <h4 className="font-medium">{formData.title || "Notification Title"}</h4>
            <p className="text-sm text-muted-foreground">
              {formData.message || "Notification message will appear here"}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}