"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface SettingsHeaderProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  onSave: () => void;
  onReset: () => void;
  onExport?: () => void;
  onImport?: () => void;
  changeCount?: number;
}

export function SettingsHeader({
  isDirty,
  isSaving,
  lastSaved,
  onSave,
  onReset,
  onExport,
  onImport,
  changeCount = 0
}: SettingsHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Company Settings</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">
              Configure system-wide attendance rules and policies
            </p>
            {lastSaved && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Last saved {format(lastSaved, "MMM dd, yyyy 'at' h:mm a")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {changeCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}
            </Badge>
          )}

          {onImport && (
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isDirty || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
