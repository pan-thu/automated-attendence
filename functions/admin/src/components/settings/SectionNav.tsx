"use client";

import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Shield,
  FileText,
  Circle
} from "lucide-react";

interface SectionNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  modifiedSections?: Set<string>;
}

const sections = [
  {
    id: "company",
    label: "Company Information",
    icon: Building2,
    description: "Basic company details"
  },
  {
    id: "workplace",
    label: "Workplace & Geofencing",
    icon: MapPin,
    description: "Location boundaries"
  },
  {
    id: "attendance",
    label: "Attendance Rules",
    icon: Clock,
    description: "Time windows & checks"
  },
  {
    id: "schedule",
    label: "Working Days & Holidays",
    icon: Calendar,
    description: "Work schedule"
  },
  {
    id: "leaves",
    label: "Leave Policies",
    icon: FileText,
    description: "Leave types & quotas"
  },
  {
    id: "penalties",
    label: "Penalty Configuration",
    icon: Shield,
    description: "Violation rules"
  }
];

export function SectionNav({
  activeSection,
  onSectionChange,
  modifiedSections = new Set()
}: SectionNavProps) {
  return (
    <nav className="h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Settings Sections
        </h2>
        <ul className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isModified = modifiedSections.has(section.id);

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    "hover:bg-gray-50",
                    isActive && "bg-blue-50 text-blue-700 border-l-3 border-blue-600"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-blue-900" : "text-gray-900"
                      )}>
                        {section.label}
                      </span>
                      {isModified && (
                        <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
