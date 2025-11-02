"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarDays,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const navSections: NavSection[] = [
  {
    title: "CORE MODULES",
    links: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Employees", href: "/employees", icon: Users },
      { label: "Attendance", href: "/attendance", icon: ClipboardCheck },
      { label: "Leaves", href: "/leaves", icon: CalendarDays },
      { label: "Penalties", href: "/penalties", icon: AlertTriangle },
    ],
  },
  {
    title: "ANALYTICS & REPORTS",
    links: [
      { label: "Audit Logs", href: "/audit-logs", icon: FileText },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "SYSTEM",
    links: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-black text-zinc-300">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <ClipboardCheck className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">AttendDesk</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && "mt-8")}>
            {/* Section Header */}
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {section.title}
            </div>

            {/* Section Links */}
            <ul className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-400 hover:bg-zinc-900/70 hover:text-white"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 h-8 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                      {active && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
