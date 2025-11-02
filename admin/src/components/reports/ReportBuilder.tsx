"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeCard } from "./DateRangeCard";
import { ScopeCard } from "./ScopeCard";
import { MetricsCard } from "./MetricsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  FileText,
  FileJson,
  Download,
  Loader2,
  CheckCircle2
} from "lucide-react";

interface ReportBuilderProps {
  onGenerate: (config: ReportConfiguration) => Promise<void>;
  isGenerating?: boolean;
}

export interface DateRangeConfig {
  type: "quick" | "custom";
  quick?: "today" | "week" | "month" | "quarter" | "year";
  start?: Date;
  end?: Date;
}

export interface ScopeConfig {
  level: "company" | "department" | "individual";
  departments?: string[];
  employees?: string[];
}

export interface MetricsConfig {
  attendance: string[];
  leaves: string[];
  penalties: string[];
}

export interface ReportConfiguration {
  dateRange: DateRangeConfig;
  scope: ScopeConfig;
  metrics: MetricsConfig;
  format: "pdf" | "excel" | "csv";
}

export function ReportBuilder({ onGenerate, isGenerating = false }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfiguration>({
    dateRange: {
      type: "quick",
      quick: "month"
    },
    scope: {
      level: "company"
    },
    metrics: {
      attendance: ["summary"],
      leaves: [],
      penalties: []
    },
    format: "excel"
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateDateRange = (dateRange: DateRangeConfig) => {
    setConfig(prev => ({ ...prev, dateRange }));
    validateConfig({ ...config, dateRange });
  };

  const updateScope = (scope: ScopeConfig) => {
    setConfig(prev => ({ ...prev, scope }));
    validateConfig({ ...config, scope });
  };

  const updateMetrics = (metrics: MetricsConfig) => {
    setConfig(prev => ({ ...prev, metrics }));
    validateConfig({ ...config, metrics });
  };

  const updateFormat = (format: "pdf" | "excel" | "csv") => {
    setConfig(prev => ({ ...prev, format }));
  };

  const validateConfig = (cfg: ReportConfiguration) => {
    const errors: string[] = [];

    // Validate date range
    if (cfg.dateRange.type === "custom" && cfg.dateRange.start && cfg.dateRange.end) {
      if (cfg.dateRange.start > cfg.dateRange.end) {
        errors.push("End date must be after start date");
      }
      if (cfg.dateRange.end > new Date()) {
        errors.push("End date cannot be in the future");
      }
    }

    // Validate metrics
    const totalMetrics = [
      ...cfg.metrics.attendance,
      ...cfg.metrics.leaves,
      ...cfg.metrics.penalties
    ].length;

    if (totalMetrics === 0) {
      errors.push("Please select at least one metric");
    }

    // Validate scope
    if (cfg.scope.level === "department" && (!cfg.scope.departments || cfg.scope.departments.length === 0)) {
      errors.push("Please select at least one department");
    }

    if (cfg.scope.level === "individual" && (!cfg.scope.employees || cfg.scope.employees.length === 0)) {
      errors.push("Please select at least one employee");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleGenerate = async () => {
    if (validateConfig(config)) {
      await onGenerate(config);
    }
  };

  const isValid = validationErrors.length === 0;
  const metricCount = [
    ...config.metrics.attendance,
    ...config.metrics.leaves,
    ...config.metrics.penalties
  ].length;

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {validationErrors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-800">
                  • {error}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Builder Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DateRangeCard
          value={config.dateRange}
          onChange={updateDateRange}
        />
        <ScopeCard
          value={config.scope}
          onChange={updateScope}
        />
        <MetricsCard
          value={config.metrics}
          onChange={updateMetrics}
        />
      </div>

      {/* Format Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Format</CardTitle>
          <CardDescription>Choose the output format for your report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateFormat("excel")}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                config.format === "excel"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className={`h-6 w-6 ${
                  config.format === "excel" ? "text-blue-600" : "text-gray-400"
                }`} />
                <span className={`text-sm font-medium ${
                  config.format === "excel" ? "text-blue-900" : "text-gray-700"
                }`}>
                  Excel
                </span>
                {config.format === "excel" && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateFormat("csv")}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                config.format === "csv"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileText className={`h-6 w-6 ${
                  config.format === "csv" ? "text-blue-600" : "text-gray-400"
                }`} />
                <span className={`text-sm font-medium ${
                  config.format === "csv" ? "text-blue-900" : "text-gray-700"
                }`}>
                  CSV
                </span>
                {config.format === "csv" && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateFormat("pdf")}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                config.format === "pdf"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <FileJson className={`h-6 w-6 ${
                  config.format === "pdf" ? "text-blue-600" : "text-gray-400"
                }`} />
                <span className={`text-sm font-medium ${
                  config.format === "pdf" ? "text-blue-900" : "text-gray-700"
                }`}>
                  PDF
                </span>
                {config.format === "pdf" && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex items-center justify-center gap-3 pt-4">
        {metricCount > 0 && (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {metricCount} {metricCount === 1 ? "metric" : "metrics"} selected
          </Badge>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
