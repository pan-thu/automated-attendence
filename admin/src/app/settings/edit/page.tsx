"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, X, Plus, Clock, Shield, Calendar, Briefcase, FileText, MapPin, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPicker } from "@/components/ui/map-picker";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useUpdateCompanySettings } from "@/hooks/useUpdateCompanySettings";
import { SectionNav } from "@/components/settings/SectionNav";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { WorkingDaysGrid } from "@/components/settings/WorkingDaysGrid";
import { TimezoneSelector } from "@/components/ui/timezone-selector";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

// Fixed check types based on business logic
const CHECK_TYPES = [
  { key: "check1", label: "Clock In" },
  { key: "check2", label: "Break" },
  { key: "check3", label: "Clock Out" },
] as const;

// Fixed violation types based on business logic
const VIOLATION_TYPES = [
  { key: "absent", label: "Full Absent", defaultThreshold: 4, defaultAmount: 20 },
  { key: "half_day_absent", label: "Half-Day Absent", defaultThreshold: 4, defaultAmount: 15 },
  { key: "late", label: "Late Arrival", defaultThreshold: 4, defaultAmount: 10 },
  { key: "early_leave", label: "Early Leave", defaultThreshold: 4, defaultAmount: 10 },
] as const;

// Fixed leave types based on business logic
const LEAVE_TYPES = [
  { key: "fullLeaveBalance", label: "Full Leave", displayKey: "full" },
  { key: "medicalLeaveBalance", label: "Medical Leave", displayKey: "medical" },
  { key: "maternityLeaveBalance", label: "Maternity Leave", displayKey: "maternity" },
] as const;

// Common MIME types for leave attachments
const COMMON_MIME_TYPES = [
  { values: ["image/jpeg"], label: "JPEG Images" },
  { values: ["image/png"], label: "PNG Images" },
  { values: ["image/gif"], label: "GIF Images" },
  { values: ["application/pdf"], label: "PDF Documents" },
  { values: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], label: "Word Documents (.doc, .docx)" },
] as const;

type TimeWindowForm = {
  key: string;
  label: string;
  start: string;
  end: string;
};

type KeyValueForm = {
  key: string;
  value: string;
};

const parseNumber = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function EditSettingsPage() {
  const { settings, loading } = useCompanySettings();
  const { submitCompanySettings, loading: submitting, error, setError } = useUpdateCompanySettings();
  const router = useRouter();

  // Section navigation
  const [activeSection, setActiveSection] = useState("company");
  const [modifiedSections, setModifiedSections] = useState(new Set<string>());
  const [originalData, setOriginalData] = useState<any>(null);
  const [originalTimeWindows, setOriginalTimeWindows] = useState<TimeWindowForm[]>([]);
  const [originalGracePeriods, setOriginalGracePeriods] = useState<KeyValueForm[]>([]);
  const [originalPenaltyThresholds, setOriginalPenaltyThresholds] = useState<KeyValueForm[]>([]);
  const [originalPenaltyAmounts, setOriginalPenaltyAmounts] = useState<KeyValueForm[]>([]);
  const [originalWorkingDays, setOriginalWorkingDays] = useState<Record<string, boolean>>({});
  const [originalHolidays, setOriginalHolidays] = useState<Array<{ date: string; description: string }>>([]);
  const [originalLeavePolicy, setOriginalLeavePolicy] = useState<KeyValueForm[]>([]);
  const [originalMaxAttachmentSize, setOriginalMaxAttachmentSize] = useState<string>("");
  const [originalSelectedMimeTypes, setOriginalSelectedMimeTypes] = useState<string[]>([]);
  const [originalRequiredLeaveTypes, setOriginalRequiredLeaveTypes] = useState<string[]>([]);

  const [form, setForm] = useState({
    companyName: "",
    timezone: "",
    workplaceLat: "",
    workplaceLng: "",
    workplaceRadius: "",
    workplaceAddress: "",
    geoFencingEnabled: false,
  });

  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [timeWindows, setTimeWindows] = useState<TimeWindowForm[]>(() =>
    CHECK_TYPES.map(checkType => ({
      key: checkType.key,
      label: checkType.label,
      start: "",
      end: "",
    }))
  );
  const [gracePeriods, setGracePeriods] = useState<KeyValueForm[]>(() =>
    CHECK_TYPES.map(checkType => ({
      key: checkType.key,
      value: "30",
    }))
  );
  const [penaltyThresholds, setPenaltyThresholds] = useState<KeyValueForm[]>(() =>
    VIOLATION_TYPES.map(violationType => ({
      key: violationType.key,
      value: String(violationType.defaultThreshold),
    }))
  );
  const [penaltyAmounts, setPenaltyAmounts] = useState<KeyValueForm[]>(() =>
    VIOLATION_TYPES.map(violationType => ({
      key: violationType.key,
      value: String(violationType.defaultAmount),
    }))
  );
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>(() =>
    DAY_ORDER.reduce((acc, day) => {
      acc[day] = day !== "saturday" && day !== "sunday";
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [holidays, setHolidays] = useState<Array<{ date: string; description: string }>>([]);
  const [newHolidayDate, setNewHolidayDate] = useState<string>("");
  const [newHolidayDescription, setNewHolidayDescription] = useState<string>("");
  const [leavePolicy, setLeavePolicy] = useState<KeyValueForm[]>(() =>
    LEAVE_TYPES.map(leaveType => ({
      key: leaveType.key,
      value: "10",
    }))
  );
  const [maxAttachmentSize, setMaxAttachmentSize] = useState<string>("");
  const [selectedMimeTypes, setSelectedMimeTypes] = useState<string[]>([]);
  const [requiredLeaveTypes, setRequiredLeaveTypes] = useState<string[]>([]);

  useEffect(() => {
    const initialData = {
      companyName: settings?.companyName ?? "",
      timezone: settings?.timezone ?? "",
      workplaceLat: settings?.workplace_center ? String(settings.workplace_center.latitude) : "",
      workplaceLng: settings?.workplace_center ? String(settings.workplace_center.longitude) : "",
      workplaceRadius: settings?.workplace_radius ? String(settings.workplace_radius) : "",
      workplaceAddress: settings?.workplaceAddress ?? "",
      geoFencingEnabled: Boolean(settings?.geoFencingEnabled),
    };

    setForm(initialData);
    setOriginalData(initialData);

    setMapCenter(
      settings?.workplace_center
        ? {
            latitude: settings.workplace_center.latitude,
            longitude: settings.workplace_center.longitude,
          }
        : null
    );

    // Initialize time windows with fixed check types
    const existingWindows = settings?.timeWindows ?? {};
    const initialTimeWindows = CHECK_TYPES.map(checkType => ({
      key: checkType.key,
      label: existingWindows[checkType.key]?.label ?? checkType.label,
      start: existingWindows[checkType.key]?.start ?? "",
      end: existingWindows[checkType.key]?.end ?? "",
    }));
    setTimeWindows(initialTimeWindows);
    setOriginalTimeWindows(JSON.parse(JSON.stringify(initialTimeWindows)));

    // Initialize grace periods with fixed check types
    const existingGracePeriods = settings?.gracePeriods ?? {};
    const initialGracePeriods = CHECK_TYPES.map(checkType => ({
      key: checkType.key,
      value: String(existingGracePeriods[checkType.key] ?? "30"),
    }));
    setGracePeriods(initialGracePeriods);
    setOriginalGracePeriods(JSON.parse(JSON.stringify(initialGracePeriods)));

    // Initialize penalty thresholds with fixed violation types
    const existingThresholds = settings?.penaltyRules?.violationThresholds ?? {};
    const initialPenaltyThresholds = VIOLATION_TYPES.map(violationType => ({
      key: violationType.key,
      value: String(existingThresholds[violationType.key] ?? violationType.defaultThreshold),
    }));
    setPenaltyThresholds(initialPenaltyThresholds);
    setOriginalPenaltyThresholds(JSON.parse(JSON.stringify(initialPenaltyThresholds)));

    // Initialize penalty amounts with fixed violation types
    const existingAmounts = settings?.penaltyRules?.amounts ?? {};
    const initialPenaltyAmounts = VIOLATION_TYPES.map(violationType => ({
      key: violationType.key,
      value: String(existingAmounts[violationType.key] ?? violationType.defaultAmount),
    }));
    setPenaltyAmounts(initialPenaltyAmounts);
    setOriginalPenaltyAmounts(JSON.parse(JSON.stringify(initialPenaltyAmounts)));

    const baseWorkingDays = DAY_ORDER.reduce((acc, day) => {
      const fallback = day !== "saturday" && day !== "sunday";
      acc[day] = settings?.workingDays?.[day] ?? fallback;
      return acc;
    }, {} as Record<string, boolean>);
    setWorkingDays(baseWorkingDays);
    setOriginalWorkingDays(JSON.parse(JSON.stringify(baseWorkingDays)));

    // Parse holidays from "YYYY-MM-DD Description" format to structured array
    const parsedHolidays = (settings?.holidays ?? []).map(holiday => {
      const match = holiday.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
      if (match) {
        return { date: match[1], description: match[2] || "" };
      }
      return { date: "", description: holiday };
    }).filter(h => h.date);
    setHolidays(parsedHolidays);
    setOriginalHolidays(JSON.parse(JSON.stringify(parsedHolidays)));

    // Initialize leave policy with fixed leave types
    const existingLeavePolicy = settings?.leavePolicy ?? {};
    const initialLeavePolicy = LEAVE_TYPES.map(leaveType => ({
      key: leaveType.key,
      value: String(existingLeavePolicy[leaveType.key] ?? "10"),
    }));
    setLeavePolicy(initialLeavePolicy);
    setOriginalLeavePolicy(JSON.parse(JSON.stringify(initialLeavePolicy)));

    const initialMaxSize = settings?.maxLeaveAttachmentSizeMb !== undefined && settings?.maxLeaveAttachmentSizeMb !== null
      ? String(settings.maxLeaveAttachmentSizeMb)
      : "";
    setMaxAttachmentSize(initialMaxSize);
    setOriginalMaxAttachmentSize(initialMaxSize);

    const initialMimeTypes = settings?.allowedLeaveAttachmentTypes ?? [];
    setSelectedMimeTypes(initialMimeTypes);
    setOriginalSelectedMimeTypes([...initialMimeTypes]);

    const initialRequiredTypes = settings?.leaveAttachmentRequiredTypes ?? [];
    setRequiredLeaveTypes(initialRequiredTypes);
    setOriginalRequiredLeaveTypes([...initialRequiredTypes]);
  }, [settings]);

  useEffect(() => {
    const lat = parseNumber(form.workplaceLat);
    const lng = parseNumber(form.workplaceLng);
    if (lat === null || lng === null) {
      return;
    }

    setMapCenter((prev) => {
      if (prev && Math.abs(prev.latitude - lat) < 1e-6 && Math.abs(prev.longitude - lng) < 1e-6) {
        return prev;
      }
      return { latitude: lat, longitude: lng };
    });
  }, [form.workplaceLat, form.workplaceLng]);

  const radiusValue = useMemo(() => {
    const parsed = parseNumber(form.workplaceRadius);
    return parsed !== null ? parsed : undefined;
  }, [form.workplaceRadius]);

  const updateTimeWindow = (index: number, field: keyof TimeWindowForm, value: string) => {
    setTimeWindows((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const updateGracePeriod = (index: number, field: keyof KeyValueForm, value: string) => {
    setGracePeriods((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const updatePenaltyThreshold = (index: number, field: keyof KeyValueForm, value: string) => {
    setPenaltyThresholds((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const updatePenaltyAmount = (index: number, field: keyof KeyValueForm, value: string) => {
    setPenaltyAmounts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const updateLeavePolicyEntry = (index: number, field: keyof KeyValueForm, value: string) => {
    setLeavePolicy((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleMapSelect = (location: { latitude: number; longitude: number }) => {
    setMapCenter(location);
    setForm((prev) => ({
      ...prev,
      workplaceLat: location.latitude.toFixed(6),
      workplaceLng: location.longitude.toFixed(6),
    }));
  };

  const addHoliday = () => {
    if (!newHolidayDate || !newHolidayDescription.trim()) {
      setError("Please provide both date and description for the holiday.");
      return;
    }

    // Check if date already exists
    if (holidays.some(h => h.date === newHolidayDate)) {
      setError("A holiday with this date already exists.");
      return;
    }

    setHolidays(prev => [...prev, { date: newHolidayDate, description: newHolidayDescription.trim() }]);
    setNewHolidayDate("");
    setNewHolidayDescription("");
    setError(null);
  };

  const removeHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  };

  const toggleMimeType = (mimeTypes: string[]) => {
    setSelectedMimeTypes(prev => {
      // Check if all types in the group are selected
      const allSelected = mimeTypes.every(type => prev.includes(type));

      if (allSelected) {
        // Remove all types in the group
        return prev.filter(type => !mimeTypes.includes(type));
      } else {
        // Add all types in the group that aren't already selected
        const newTypes = mimeTypes.filter(type => !prev.includes(type));
        return [...prev, ...newTypes];
      }
    });
  };

  const toggleRequiredLeaveType = (leaveType: string) => {
    setRequiredLeaveTypes(prev =>
      prev.includes(leaveType)
        ? prev.filter(type => type !== leaveType)
        : [...prev, leaveType]
    );
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

      const payload: Record<string, unknown> = {
        companyName: form.companyName || undefined,
        timezone: form.timezone || undefined,
        geoFencingEnabled: form.geoFencingEnabled,
      };

    if (mapCenter) {
      payload.workplace_center = mapCenter;
    }

    if (form.workplaceRadius) {
      const radius = parseNumber(form.workplaceRadius);
      if (radius === null || radius <= 0) {
        setError("Workplace radius must be a positive number.");
        return;
      }
      payload.workplace_radius = radius;
    }

    if (form.workplaceAddress) {
      payload.workplaceAddress = form.workplaceAddress.trim();
    }

    const timeWindowPayload = timeWindows.reduce<Record<string, { label: string; start: string; end: string }>>((acc, item) => {
      const key = item.key.trim();
      if (!key) {
        return acc;
      }
      if (!item.start || !item.end) {
        setError(`Time window "${item.label || key}" requires start and end times.`);
        throw new Error("validation");
      }
      acc[key] = {
        label: item.label.trim() || key,
        start: item.start,
        end: item.end,
      };
      return acc;
    }, {});

    const gracePayload = gracePeriods.reduce<Record<string, number>>((acc, item) => {
      const key = item.key.trim();
      if (!key || !item.value.trim()) return acc;
      const numeric = parseNumber(item.value);
      if (numeric === null) {
        setError(`Grace period for "${key}" must be a number.`);
        throw new Error("validation");
      }
      acc[key] = Math.max(0, Math.round(numeric));
      return acc;
    }, {});

    const penaltyThresholdsPayload = penaltyThresholds.reduce<Record<string, number>>((acc, item) => {
      const key = item.key.trim();
      if (!key || !item.value.trim()) return acc;
      const numeric = parseNumber(item.value);
      if (numeric === null || numeric < 0) {
        setError(`Penalty threshold for "${key}" must be a non-negative number.`);
        throw new Error("validation");
      }
      acc[key] = Math.round(numeric);
      return acc;
    }, {});

    const penaltyAmountsPayload = penaltyAmounts.reduce<Record<string, number>>((acc, item) => {
      const key = item.key.trim();
      if (!key || !item.value.trim()) return acc;
      const numeric = parseNumber(item.value);
      if (numeric === null) {
        setError(`Penalty amount for "${key}" must be a number.`);
        throw new Error("validation");
      }
      acc[key] = numeric;
      return acc;
    }, {});

    const leavePolicyPayload = leavePolicy.reduce<Record<string, number>>((acc, item) => {
      const key = item.key.trim();
      if (!key || !item.value.trim()) return acc;
      const numeric = parseNumber(item.value);
      if (numeric === null) {
        setError(`Leave allocation for "${key}" must be a number.`);
        throw new Error("validation");
      }
      acc[key] = numeric;
      return acc;
    }, {});

    try {
      if (Object.keys(timeWindowPayload).length > 0) {
        payload.timeWindows = timeWindowPayload;
      }

      if (Object.keys(gracePayload).length > 0) {
        payload.gracePeriods = gracePayload;
      }

      if (Object.keys(penaltyThresholdsPayload).length > 0 || Object.keys(penaltyAmountsPayload).length > 0) {
        payload.penaltyRules = {
          violationThresholds: penaltyThresholdsPayload,
          amounts: penaltyAmountsPayload,
        };
      }

      payload.workingDays = workingDays;

      // Process holidays - convert back to "YYYY-MM-DD Description" format
      const holidayStrings = holidays.map(h => `${h.date} ${h.description}`.trim());
      payload.holidays = holidayStrings;

      if (Object.keys(leavePolicyPayload).length > 0) {
        payload.leavePolicy = leavePolicyPayload;
      }

      if (maxAttachmentSize.trim()) {
        const attachmentSizeNumeric = parseNumber(maxAttachmentSize);
        if (attachmentSizeNumeric === null || attachmentSizeNumeric <= 0) {
          setError("Max attachment size must be a positive number.");
          return;
        }
        payload.maxLeaveAttachmentSizeMb = attachmentSizeNumeric;
      }

      payload.allowedLeaveAttachmentTypes = selectedMimeTypes;
      payload.leaveAttachmentRequiredTypes = requiredLeaveTypes;

      await submitCompanySettings(payload);
      router.push("/settings");
    } catch (err) {
      if ((err as Error).message !== "validation") {
      console.error("Failed to update settings", err);
        setError("Failed to update company settings. Please try again.");
      }
    }
  }

  const disableSubmit = submitting || loading;

  // Calculate if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;

    // Check all state variables for changes
    return (
      JSON.stringify(form) !== JSON.stringify(originalData) ||
      JSON.stringify(timeWindows) !== JSON.stringify(originalTimeWindows) ||
      JSON.stringify(gracePeriods) !== JSON.stringify(originalGracePeriods) ||
      JSON.stringify(penaltyThresholds) !== JSON.stringify(originalPenaltyThresholds) ||
      JSON.stringify(penaltyAmounts) !== JSON.stringify(originalPenaltyAmounts) ||
      JSON.stringify(workingDays) !== JSON.stringify(originalWorkingDays) ||
      JSON.stringify(holidays) !== JSON.stringify(originalHolidays) ||
      JSON.stringify(leavePolicy) !== JSON.stringify(originalLeavePolicy) ||
      maxAttachmentSize !== originalMaxAttachmentSize ||
      JSON.stringify(selectedMimeTypes) !== JSON.stringify(originalSelectedMimeTypes) ||
      JSON.stringify(requiredLeaveTypes) !== JSON.stringify(originalRequiredLeaveTypes)
    );
  }, [
    form, originalData,
    timeWindows, originalTimeWindows,
    gracePeriods, originalGracePeriods,
    penaltyThresholds, originalPenaltyThresholds,
    penaltyAmounts, originalPenaltyAmounts,
    workingDays, originalWorkingDays,
    holidays, originalHolidays,
    leavePolicy, originalLeavePolicy,
    maxAttachmentSize, originalMaxAttachmentSize,
    selectedMimeTypes, originalSelectedMimeTypes,
    requiredLeaveTypes, originalRequiredLeaveTypes
  ]);

  const handleReset = useCallback(() => {
    if (originalData) {
      setForm(originalData);
      setTimeWindows(JSON.parse(JSON.stringify(originalTimeWindows)));
      setGracePeriods(JSON.parse(JSON.stringify(originalGracePeriods)));
      setPenaltyThresholds(JSON.parse(JSON.stringify(originalPenaltyThresholds)));
      setPenaltyAmounts(JSON.parse(JSON.stringify(originalPenaltyAmounts)));
      setWorkingDays(JSON.parse(JSON.stringify(originalWorkingDays)));
      setHolidays(JSON.parse(JSON.stringify(originalHolidays)));
      setLeavePolicy(JSON.parse(JSON.stringify(originalLeavePolicy)));
      setMaxAttachmentSize(originalMaxAttachmentSize);
      setSelectedMimeTypes([...originalSelectedMimeTypes]);
      setRequiredLeaveTypes([...originalRequiredLeaveTypes]);
      setModifiedSections(new Set());
      setError(null);
    }
  }, [
    originalData,
    originalTimeWindows,
    originalGracePeriods,
    originalPenaltyThresholds,
    originalPenaltyAmounts,
    originalWorkingDays,
    originalHolidays,
    originalLeavePolicy,
    originalMaxAttachmentSize,
    originalSelectedMimeTypes,
    originalRequiredLeaveTypes
  ]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    scrollToSection(sectionId);
  }, [scrollToSection]);

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-72 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
            <SectionNav
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              modifiedSections={modifiedSections}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="sticky top-0 z-10">
              <SettingsHeader
                isDirty={isDirty}
                isSaving={submitting}
                lastSaved={settings?.updatedAt ?? undefined}
                onSave={() => handleSubmit(new Event('submit') as any)}
                onReset={handleReset}
              />
            </div>

            {/* Scrollable Content */}
            <div className="bg-gray-50">
              <div className="max-w-4xl mx-auto px-6 py-6">
                <form onSubmit={handleSubmit}>
                  {/* Company Details Section */}
                  <section id="section-company" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Company Details</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">General metadata used throughout the dashboard.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={form.companyName}
                          onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <TimezoneSelector
                          value={form.timezone}
                          onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
                          placeholder="Select a timezone..."
                        />
                        <p className="text-xs text-muted-foreground">Choose the timezone for your company's operations.</p>
                      </div>
                    </div>
                  </section>

                  {/* Geofencing Section */}
                  <section id="section-workplace" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Geofencing</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">Select the workplace center and radius employees must be within when clocking in.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="workplaceLat">Workplace Latitude</Label>
                        <Input
                          id="workplaceLat"
                          value={form.workplaceLat}
                          onChange={(event) => setForm((prev) => ({ ...prev, workplaceLat: event.target.value }))}
                          placeholder="16.840900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workplaceLng">Workplace Longitude</Label>
                        <Input
                          id="workplaceLng"
                          value={form.workplaceLng}
                          onChange={(event) => setForm((prev) => ({ ...prev, workplaceLng: event.target.value }))}
                          placeholder="96.173500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workplaceRadius">Workplace Radius (meters)</Label>
                        <Input
                          id="workplaceRadius"
                          value={form.workplaceRadius}
                          onChange={(event) => setForm((prev) => ({ ...prev, workplaceRadius: event.target.value }))}
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="workplaceAddress">Workplace Address (optional)</Label>
                      <Input
                        id="workplaceAddress"
                        value={form.workplaceAddress}
                        onChange={(event) => setForm((prev) => ({ ...prev, workplaceAddress: event.target.value }))}
                        placeholder="e.g. Vashi - Navi Mumbai"
                      />
                      <p className="text-xs text-muted-foreground">Display name for the office location shown to employees.</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Toggle
                        id="geoFencingEnabled"
                        checked={form.geoFencingEnabled}
                        onChange={(event) => setForm((prev) => ({ ...prev, geoFencingEnabled: event.target.checked }))}
                        label="Require employees to be within the configured geofence."
                      />
                    </div>
                    <div className="mt-4">
                      <MapPicker value={mapCenter} radius={radiusValue} onChange={handleMapSelect} />
                    </div>
                  </section>

                  {/* Attendance Windows Section */}
                  <section id="section-attendance" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Attendance Windows & Grace Periods</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Configure the daily check windows and any grace periods employees receive.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Time Windows</h3>
                        <p className="text-xs text-muted-foreground">Set the start and end times for each check type.</p>
                        <div className="space-y-3">
                          {timeWindows.map((window, index) => {
                            const checkType = CHECK_TYPES.find(ct => ct.key === window.key);
                            return (
                              <div key={`time-window-${index}`} className="grid gap-3 md:grid-cols-[140px_1fr]">
                                <div className="flex items-center">
                                  <Label className="text-sm font-medium">{checkType?.label ?? window.label}</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label htmlFor={`${window.key}-start`} className="text-xs text-muted-foreground">Start Time</Label>
                                    <Input
                                      id={`${window.key}-start`}
                                      type="time"
                                      value={window.start}
                                      onChange={(event) => updateTimeWindow(index, "start", event.target.value)}
                                      aria-label={`${checkType?.label} start time`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`${window.key}-end`} className="text-xs text-muted-foreground">End Time</Label>
                                    <Input
                                      id={`${window.key}-end`}
                                      type="time"
                                      value={window.end}
                                      onChange={(event) => updateTimeWindow(index, "end", event.target.value)}
                                      aria-label={`${checkType?.label} end time`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Grace Periods (minutes)</h3>
                        <p className="text-xs text-muted-foreground">Set the grace period in minutes for each check type.</p>
                        <div className="space-y-3">
                          {gracePeriods.map((entry, index) => {
                            const checkType = CHECK_TYPES.find(ct => ct.key === entry.key);
                            return (
                              <div key={`grace-${index}`} className="grid gap-3 md:grid-cols-[140px_1fr]">
                                <div className="flex items-center">
                                  <Label className="text-sm font-medium">{checkType?.label ?? entry.key}</Label>
                                </div>
                                <div className="max-w-[120px]">
                                  <Input
                                    type="number"
                                    value={entry.value}
                                    onChange={(event) => updateGracePeriod(index, "value", event.target.value)}
                                    placeholder="30"
                                    aria-label={`${checkType?.label} grace period`}
                                    min="0"
                                    max="120"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Penalty Rules Section */}
                  <section id="section-penalties" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Penalty Rules</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">Define violation thresholds and fee amounts per violation type. Penalties apply when a violation type exceeds its threshold within a month.</p>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Violation Thresholds</h3>
                        <p className="text-xs text-muted-foreground">Number of violations allowed per month before penalty applies.</p>
                        <div className="space-y-3">
                          {penaltyThresholds.map((entry, index) => {
                            const violationType = VIOLATION_TYPES.find(vt => vt.key === entry.key);
                            return (
                              <div key={`threshold-${index}`} className="grid gap-3 md:grid-cols-[200px_1fr]">
                                <div className="flex items-center">
                                  <Label className="text-sm font-medium">{violationType?.label ?? entry.key}</Label>
                                </div>
                                <div className="max-w-[120px]">
                                  <Input
                                    type="number"
                                    value={entry.value}
                                    onChange={(event) => updatePenaltyThreshold(index, "value", event.target.value)}
                                    placeholder="4"
                                    aria-label={`${violationType?.label} threshold`}
                                    min="1"
                                    max="30"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Penalty Amounts (USD)</h3>
                        <p className="text-xs text-muted-foreground">Fee charged when violation threshold is exceeded.</p>
                        <div className="space-y-3">
                          {penaltyAmounts.map((entry, index) => {
                            const violationType = VIOLATION_TYPES.find(vt => vt.key === entry.key);
                            return (
                              <div key={`penalty-${index}`} className="grid gap-3 md:grid-cols-[200px_1fr]">
                                <div className="flex items-center">
                                  <Label className="text-sm font-medium">{violationType?.label ?? entry.key}</Label>
                                </div>
                                <div className="max-w-[120px]">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      value={entry.value}
                                      onChange={(event) => updatePenaltyAmount(index, "value", event.target.value)}
                                      placeholder="10"
                                      aria-label={`${violationType?.label} amount`}
                                      className="pl-7"
                                      min="0"
                                      step="0.01"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Working Days & Holidays Section */}
                  <section id="section-schedule" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Working Days & Holidays</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">Control which days require attendance and the official holiday list.</p>

                    <div className="mt-4 space-y-6">
                      <div className="space-y-3">
                        <Label>Working Days</Label>
                        <WorkingDaysGrid
                          value={workingDays}
                          onChange={setWorkingDays}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Company Holidays</Label>
                        <div className="space-y-3">
                          {/* Add Holiday Form */}
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                placeholder="Select date"
                                className="w-full"
                              />
                            </div>
                            <div className="flex-[2]">
                              <Input
                                type="text"
                                value={newHolidayDescription}
                                onChange={(e) => setNewHolidayDescription(e.target.value)}
                                placeholder="Holiday description (e.g., New Year's Day)"
                                className="w-full"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={addHoliday}
                              size="sm"
                              className="shrink-0"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          {/* Holiday List */}
                          {holidays.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {holidays.sort((a, b) => a.date.localeCompare(b.date)).map((holiday) => (
                                <Badge
                                  key={holiday.date}
                                  variant="secondary"
                                  className="px-3 py-1.5 text-sm flex items-center gap-2"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  <span className="font-medium">{holiday.date}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span>{holiday.description}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeHoliday(holiday.date)}
                                    className="ml-1 hover:text-destructive transition-colors"
                                    aria-label={`Remove ${holiday.description}`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No holidays configured yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Leave Policy Section */}
                  <section id="section-leaves" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Leave Policy</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">Configure leave allowances and attachment requirements.</p>

                    <div className="mt-4 space-y-6">
                      {/* Attachment Configuration */}
                      <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Attachment Settings</h3>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Max Attachment Size */}
                          <div className="space-y-2">
                            <Label htmlFor="maxAttachmentSize">Max File Size (MB)</Label>
                            <Input
                              id="maxAttachmentSize"
                              type="number"
                              value={maxAttachmentSize}
                              onChange={(event) => setMaxAttachmentSize(event.target.value)}
                              placeholder="5"
                              min="0"
                              max="100"
                            />
                          </div>

                          {/* Leave Types Requiring Attachments */}
                          <div className="space-y-2">
                            <Label>Leave Types Requiring Attachments</Label>
                            <div className="space-y-2">
                              {LEAVE_TYPES.map((leaveType) => (
                                <div key={leaveType.displayKey} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`required-${leaveType.displayKey}`}
                                    checked={requiredLeaveTypes.includes(leaveType.displayKey)}
                                    onCheckedChange={() => toggleRequiredLeaveType(leaveType.displayKey)}
                                  />
                                  <label
                                    htmlFor={`required-${leaveType.displayKey}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {leaveType.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Allowed MIME Types */}
                        <div className="space-y-2">
                          <Label>Allowed File Types</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {COMMON_MIME_TYPES.map((mimeType) => {
                              const allChecked = mimeType.values.every(val => selectedMimeTypes.includes(val));
                              const key = mimeType.values.join('|');
                              return (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`mime-${key}`}
                                    checked={allChecked}
                                    onCheckedChange={() => toggleMimeType(mimeType.values as unknown as string[])}
                                  />
                                  <label
                                    htmlFor={`mime-${key}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {mimeType.label}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select which file types employees can upload as leave attachments.
                          </p>
                        </div>
                      </div>

                      {/* Leave Allowances */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Annual Leave Allowances (days)</h3>
                        <p className="text-xs text-muted-foreground">Set the annual leave quota for each leave type.</p>
                        <div className="space-y-3">
                          {leavePolicy.map((entry, index) => {
                            const leaveType = LEAVE_TYPES.find(lt => lt.key === entry.key);
                            return (
                              <div key={`leave-${index}`} className="grid gap-3 md:grid-cols-[200px_1fr]">
                                <div className="flex items-center">
                                  <Label className="text-sm font-medium">{leaveType?.label ?? entry.key}</Label>
                                </div>
                                <div className="max-w-[120px]">
                                  <Input
                                    type="number"
                                    value={entry.value}
                                    onChange={(event) => updateLeavePolicyEntry(index, "value", event.target.value)}
                                    placeholder="10"
                                    aria-label={`${leaveType?.label} allowance`}
                                    min="0"
                                    max="365"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Error Display */}
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}
