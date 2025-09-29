"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useUpdateCompanySettings } from "@/hooks/useUpdateCompanySettings";

const parseNumber = (value: string) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function EditSettingsPage() {
  const { settings, loading } = useCompanySettings();
  const { submitCompanySettings, loading: submitting, error, setError } = useUpdateCompanySettings();
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    timezone: "",
    workplaceLat: "",
    workplaceLng: "",
    workplaceRadius: "",
    geoFencingEnabled: false,
  });

  useEffect(() => {
    if (!settings) return;

    setForm({
      companyName: settings.companyName ?? "",
      timezone: settings.timezone ?? "",
      workplaceLat: settings.workplace_center ? String(settings.workplace_center.latitude) : "",
      workplaceLng: settings.workplace_center ? String(settings.workplace_center.longitude) : "",
      workplaceRadius: settings.workplace_radius ? String(settings.workplace_radius) : "",
      geoFencingEnabled: Boolean(settings.geoFencingEnabled),
    });
  }, [settings]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload: Record<string, unknown> = {
        companyName: form.companyName || undefined,
        timezone: form.timezone || undefined,
        geoFencingEnabled: form.geoFencingEnabled,
      };

      if (form.workplaceLat && form.workplaceLng) {
        const latitude = parseNumber(form.workplaceLat);
        const longitude = parseNumber(form.workplaceLng);
        if (latitude === null || longitude === null) {
          setError("Workplace coordinates must be valid numbers.");
          return;
        }
        payload.workplace_center = { latitude, longitude };
      }

      if (form.workplaceRadius) {
        const radius = parseNumber(form.workplaceRadius);
        if (radius === null) {
          setError("Workplace radius must be a valid number.");
          return;
        }
        payload.workplace_radius = radius;
      }

      await submitCompanySettings(payload);
      router.push("/settings");
    } catch (err) {
      console.error("Failed to update settings", err);
    }
  }

  const disableSubmit = useMemo(() => submitting || loading, [loading, submitting]);

  return (
    <ProtectedLayout>
      <DashboardLayout>
        <div className="flex flex-col gap-6 p-6">
          <header>
            <h1 className="text-2xl font-semibold">Edit Settings</h1>
            <p className="text-sm text-muted-foreground">Update core company configuration. Use caution before saving.</p>
          </header>

          <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
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

            <div className="space-y-2">
              <Label htmlFor="workplaceLat">Workplace Latitude</Label>
              <Input
                id="workplaceLat"
                value={form.workplaceLat}
                onChange={(event) => setForm((prev) => ({ ...prev, workplaceLat: event.target.value }))}
                placeholder="37.421999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workplaceLng">Workplace Longitude</Label>
              <Input
                id="workplaceLng"
                value={form.workplaceLng}
                onChange={(event) => setForm((prev) => ({ ...prev, workplaceLng: event.target.value }))}
                placeholder="-122.084057"
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

            <div className="space-y-2">
              <Label htmlFor="geoFencingEnabled">Geofencing Enabled</Label>
              <Toggle
                id="geoFencingEnabled"
                checked={form.geoFencingEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, geoFencingEnabled: event.target.checked }))}
                label="Require employees to be within geofence for attendance."
              />
            </div>

            {error ? (
              <p className="md:col-span-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="md:col-span-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.push("/settings");
                }}
                disabled={disableSubmit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {submitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedLayout>
  );
}

