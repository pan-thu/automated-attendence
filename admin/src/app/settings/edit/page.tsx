"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { MapPicker } from "@/components/ui/map-picker";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useUpdateCompanySettings } from "@/hooks/useUpdateCompanySettings";
import { SectionNav } from "@/components/settings/SectionNav";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { WorkingDaysGrid } from "@/components/settings/WorkingDaysGrid";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

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

  const [form, setForm] = useState({
    companyName: "",
    timezone: "",
    workplaceLat: "",
    workplaceLng: "",
    workplaceRadius: "",
    geoFencingEnabled: false,
  });

  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [timeWindows, setTimeWindows] = useState<TimeWindowForm[]>([]);
  const [gracePeriods, setGracePeriods] = useState<KeyValueForm[]>([]);
  const [penaltyThresholds, setPenaltyThresholds] = useState<KeyValueForm[]>([]);
  const [penaltyAmounts, setPenaltyAmounts] = useState<KeyValueForm[]>([]);
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>(() =>
    DAY_ORDER.reduce((acc, day) => {
      acc[day] = day !== "saturday" && day !== "sunday";
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [holidaysText, setHolidaysText] = useState<string>("");
  const [leavePolicy, setLeavePolicy] = useState<KeyValueForm[]>([]);
  const [maxAttachmentSize, setMaxAttachmentSize] = useState<string>("");
  const [allowedAttachmentTypes, setAllowedAttachmentTypes] = useState<string>("");
  const [requiredAttachmentTypes, setRequiredAttachmentTypes] = useState<string>("");

  useEffect(() => {
    if (!settings) return;

    const initialData = {
      companyName: settings.companyName ?? "",
      timezone: settings.timezone ?? "",
      workplaceLat: settings.workplace_center ? String(settings.workplace_center.latitude) : "",
      workplaceLng: settings.workplace_center ? String(settings.workplace_center.longitude) : "",
      workplaceRadius: settings.workplace_radius ? String(settings.workplace_radius) : "",
      geoFencingEnabled: Boolean(settings.geoFencingEnabled),
    };

    setForm(initialData);
    setOriginalData(initialData);

    setMapCenter(
      settings.workplace_center
        ? {
            latitude: settings.workplace_center.latitude,
            longitude: settings.workplace_center.longitude,
          }
        : null
    );

    setTimeWindows(
      Object.entries(settings.timeWindows ?? {}).map(([key, window]) => ({
        key,
        label: window.label ?? key,
        start: window.start ?? "",
        end: window.end ?? "",
      }))
    );

    setGracePeriods(
      Object.entries(settings.gracePeriods ?? {}).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    );

    setPenaltyThresholds(
      Object.entries(settings.penaltyRules?.violationThresholds ?? {}).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    );

    setPenaltyAmounts(
      Object.entries(settings.penaltyRules?.amounts ?? {}).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    );

    const baseWorkingDays = DAY_ORDER.reduce((acc, day) => {
      const fallback = day !== "saturday" && day !== "sunday";
      acc[day] = settings.workingDays?.[day] ?? fallback;
      return acc;
    }, {} as Record<string, boolean>);
    setWorkingDays(baseWorkingDays);

    setHolidaysText((settings.holidays ?? []).join("\n"));

    setLeavePolicy(
      Object.entries(settings.leavePolicy ?? {}).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    );

    setMaxAttachmentSize(
      settings.maxLeaveAttachmentSizeMb !== undefined && settings.maxLeaveAttachmentSizeMb !== null
        ? String(settings.maxLeaveAttachmentSizeMb)
        : ""
    );

    setAllowedAttachmentTypes((settings.allowedLeaveAttachmentTypes ?? []).join(", "));
    setRequiredAttachmentTypes((settings.leaveAttachmentRequiredTypes ?? []).join(", "));
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

  const addTimeWindow = () => {
    setTimeWindows((prev) => [...prev, { key: "", label: "", start: "", end: "" }]);
  };

  const updateTimeWindow = (index: number, field: keyof TimeWindowForm, value: string) => {
    setTimeWindows((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addGracePeriod = () => {
    setGracePeriods((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateGracePeriod = (index: number, field: keyof KeyValueForm, value: string) => {
    setGracePeriods((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeGracePeriod = (index: number) => {
    setGracePeriods((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addPenaltyThreshold = () => {
    setPenaltyThresholds((prev) => [...prev, { key: "", value: "" }]);
  };

  const updatePenaltyThreshold = (index: number, field: keyof KeyValueForm, value: string) => {
    setPenaltyThresholds((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removePenaltyThreshold = (index: number) => {
    setPenaltyThresholds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addPenaltyAmount = () => {
    setPenaltyAmounts((prev) => [...prev, { key: "", value: "" }]);
  };

  const updatePenaltyAmount = (index: number, field: keyof KeyValueForm, value: string) => {
    setPenaltyAmounts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removePenaltyAmount = (index: number) => {
    setPenaltyAmounts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addLeavePolicyEntry = () => {
    setLeavePolicy((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateLeavePolicyEntry = (index: number, field: keyof KeyValueForm, value: string) => {
    setLeavePolicy((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeLeavePolicyEntry = (index: number) => {
    setLeavePolicy((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMapSelect = (location: { latitude: number; longitude: number }) => {
    setMapCenter(location);
    setForm((prev) => ({
      ...prev,
      workplaceLat: location.latitude.toFixed(6),
      workplaceLng: location.longitude.toFixed(6),
    }));
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

      const holidayList = holidaysText
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
      payload.holidays = holidayList;

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

      payload.allowedLeaveAttachmentTypes = allowedAttachmentTypes
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);

      payload.leaveAttachmentRequiredTypes = requiredAttachmentTypes
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);

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
    return JSON.stringify(form) !== JSON.stringify(originalData);
  }, [form, originalData]);

  const handleReset = useCallback(() => {
    if (originalData) {
      setForm(originalData);
      setModifiedSections(new Set());
    }
  }, [originalData]);

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
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-72 flex-shrink-0">
            <SectionNav
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              modifiedSections={modifiedSections}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <SettingsHeader
              isDirty={isDirty}
              isSaving={submitting}
              lastSaved={settings?.updatedAt ?? undefined}
              onSave={() => handleSubmit(new Event('submit') as any)}
              onReset={handleReset}
            />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <form className="max-w-4xl mx-auto p-6 space-y-6" onSubmit={handleSubmit}>
            <section id="section-company" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Company Details</h2>
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
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                placeholder="e.g. America/New_York"
              />
            </div>
            </div>
            </section>

            <section id="section-workplace" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Geofencing</h2>
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

            <section id="section-attendance" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Attendance Windows & Grace Periods</h2>
              <p className="text-xs text-muted-foreground">
                Configure the daily check windows and any grace periods employees receive.
              </p>

              <div className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Time Windows</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addTimeWindow}>
                      Add window
                    </Button>
                  </div>
                  {timeWindows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No windows configured. Add at least one window for each check-in.</p>
                  ) : (
                    <div className="space-y-3">
                      {timeWindows.map((window, index) => (
                        <div key={`time-window-${index}`} className="grid gap-3 md:grid-cols-[120px_1fr_1fr_40px]">
                          <Input
                            value={window.key}
                            onChange={(event) => updateTimeWindow(index, "key", event.target.value)}
                            placeholder="check1"
                            aria-label="Window key"
                          />
                          <Input
                            value={window.label}
                            onChange={(event) => updateTimeWindow(index, "label", event.target.value)}
                            placeholder="Morning Check"
                            aria-label="Window label"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="time"
                              value={window.start}
                              onChange={(event) => updateTimeWindow(index, "start", event.target.value)}
                              aria-label="Window start time"
                            />
                            <Input
                              type="time"
                              value={window.end}
                              onChange={(event) => updateTimeWindow(index, "end", event.target.value)}
                              aria-label="Window end time"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeWindow(index)} aria-label="Remove time window">
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Grace Periods (minutes)</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addGracePeriod}>
                      Add grace period
                    </Button>
                  </div>
                  {gracePeriods.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No grace periods configured.</p>
                  ) : (
                    <div className="space-y-3">
                      {gracePeriods.map((entry, index) => (
                        <div key={`grace-${index}`} className="grid gap-3 md:grid-cols-[140px_1fr_40px]">
                          <Input
                            value={entry.key}
                            onChange={(event) => updateGracePeriod(index, "key", event.target.value)}
                            placeholder="check1"
                            aria-label="Grace period key"
                          />
                          <Input
                            value={entry.value}
                            onChange={(event) => updateGracePeriod(index, "value", event.target.value)}
                            placeholder="15"
                            aria-label="Grace period value"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeGracePeriod(index)} aria-label="Remove grace period">
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="section-penalties" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Penalty Rules</h2>
              <p className="text-xs text-muted-foreground">Define violation thresholds and fee amounts per violation type. Penalties apply when a violation type exceeds its threshold within a month.</p>

              <div className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Violation Thresholds (per type)</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addPenaltyThreshold}>
                      Add threshold
                    </Button>
                  </div>
                  {penaltyThresholds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No thresholds configured. Add thresholds for: absent, half_day_absent, late, early_leave.</p>
                  ) : (
                    <div className="space-y-3">
                      {penaltyThresholds.map((entry, index) => (
                        <div key={`threshold-${index}`} className="grid gap-3 md:grid-cols-[160px_1fr_40px]">
                          <Input
                            value={entry.key}
                            onChange={(event) => updatePenaltyThreshold(index, "key", event.target.value)}
                            placeholder="absent"
                            aria-label="Violation type"
                          />
                          <Input
                            value={entry.value}
                            onChange={(event) => updatePenaltyThreshold(index, "value", event.target.value)}
                            placeholder="4"
                            aria-label="Threshold count"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePenaltyThreshold(index)} aria-label="Remove threshold">
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Penalty Amounts (per type)</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addPenaltyAmount}>
                      Add amount
                    </Button>
                  </div>
                  {penaltyAmounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No penalty amounts configured.</p>
                  ) : (
                    <div className="space-y-3">
                      {penaltyAmounts.map((entry, index) => (
                        <div key={`penalty-${index}`} className="grid gap-3 md:grid-cols-[160px_1fr_40px]">
                          <Input
                            value={entry.key}
                            onChange={(event) => updatePenaltyAmount(index, "key", event.target.value)}
                            placeholder="late"
                            aria-label="Penalty key"
                          />
                          <Input
                            value={entry.value}
                            onChange={(event) => updatePenaltyAmount(index, "value", event.target.value)}
                            placeholder="10"
                            aria-label="Penalty amount"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePenaltyAmount(index)} aria-label="Remove penalty amount">
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="section-schedule" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Working Days & Holidays</h2>
              <p className="text-xs text-muted-foreground">Control which days require attendance and the official holiday list.</p>

              <div className="mt-4 space-y-6">
                <div className="space-y-3">
                  <Label>Working Days</Label>
                  <WorkingDaysGrid
                    value={workingDays}
                    onChange={setWorkingDays}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holidays">Holidays (one per line)</Label>
                  <Textarea
                    id="holidays"
                    rows={6}
                    value={holidaysText}
                    onChange={(event) => setHolidaysText(event.target.value)}
                    placeholder="2025-01-01  New Year\n2025-02-17  Company Retreat"
                  />
                </div>
              </div>
            </section>

            <section id="section-leaves" className="rounded-lg border bg-card p-5 shadow-sm scroll-mt-6">
              <h2 className="text-lg font-semibold">Leave Policy & Attachments</h2>
              <p className="text-xs text-muted-foreground">Set annual allowances and any attachment requirements for supporting documents.</p>

              <div className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Leave Allowances (days per year)</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addLeavePolicyEntry}>
                      Add leave type
                    </Button>
                  </div>
                  {leavePolicy.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No leave policy entries configured.</p>
                  ) : (
                    <div className="space-y-3">
                      {leavePolicy.map((entry, index) => (
                        <div key={`leave-${index}`} className="grid gap-3 md:grid-cols-[160px_1fr_40px]">
                          <Input
                            value={entry.key}
                            onChange={(event) => updateLeavePolicyEntry(index, "key", event.target.value)}
                            placeholder="medical"
                            aria-label="Leave type"
                          />
                          <Input
                            value={entry.value}
                            onChange={(event) => updateLeavePolicyEntry(index, "value", event.target.value)}
                            placeholder="10"
                            aria-label="Leave allocation"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeLeavePolicyEntry(index)} aria-label="Remove leave type">
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="maxAttachmentSize">Max Attachment Size (MB)</Label>
                    <Input
                      id="maxAttachmentSize"
                      value={maxAttachmentSize}
                      onChange={(event) => setMaxAttachmentSize(event.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="allowedAttachmentTypes">Allowed Attachment MIME Types (comma separated)</Label>
                    <Input
                      id="allowedAttachmentTypes"
                      value={allowedAttachmentTypes}
                      onChange={(event) => setAllowedAttachmentTypes(event.target.value)}
                      placeholder="application/pdf, image/png"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="requiredAttachmentTypes">Leave Types Requiring Attachments (comma separated)</Label>
                    <Input
                      id="requiredAttachmentTypes"
                      value={requiredAttachmentTypes}
                      onChange={(event) => setRequiredAttachmentTypes(event.target.value)}
                      placeholder="medical, maternity"
                    />
                  </div>
                </div>
              </div>
            </section>

                {/* Error Display */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 -mx-6 -mb-6 rounded-b-lg">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/settings")}
                    disabled={disableSubmit}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!isDirty || disableSubmit}>
                    {submitting ? "Saving Changes..." : "Save All Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

