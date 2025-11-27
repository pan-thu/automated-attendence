"use client";

import Image from "next/image";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";

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
  const { isCollapsed, toggleSidebar } = useSidebar();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-800 bg-black text-zinc-300 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-zinc-800 py-5 transition-all duration-300",
        isCollapsed ? "justify-center px-4" : "gap-2 px-6"
      )}>
        <Image
          src="/logo-dark.svg"
          alt="AttenDesk"
          width={32}
          height={32}
          className="shrink-0"
        />
        {!isCollapsed && (
          <span className="text-lg font-semibold text-white whitespace-nowrap">AttenDesk</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && "mt-8")}>
            {/* Section Header */}
            {!isCollapsed && (
              <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </div>
            )}

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
                          : "text-zinc-400 hover:bg-zinc-900/70 hover:text-white",
                        isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? link.label : undefined}
                    >
                      {active && !isCollapsed && (
                        <div className="absolute left-0 h-8 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{link.label}</span>}
                      {active && !isCollapsed && (
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

      {/* Toggle Button */}
      <div className="border-t border-zinc-800 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "w-full text-zinc-400 hover:bg-zinc-900/70 hover:text-white",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
