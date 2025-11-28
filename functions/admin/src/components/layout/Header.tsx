"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight, LogOut, User } from "lucide-react";

import type { UserSummary } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: UserSummary | null;
  onLogout: () => Promise<void> | void;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/leaves": "Leaves",
  "/penalties": "Penalties",
  "/reports": "Reports",
  "/audit-logs": "Audit Logs",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/settings": "Settings",
};

export function Header({ user, onLogout }: HeaderProps) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  async function handleLogout() {
    try {
      setLoading(true);
      await onLogout();
    } finally {
      setLoading(false);
    }
  }

  // Get page title from pathname
  const getPageTitle = () => {
    // Handle dynamic routes like /employees/[id]
    for (const [route, title] of Object.entries(routeTitles)) {
      if (pathname === route || (route !== "/" && pathname.startsWith(route))) {
        return title;
      }
    }
    return "Dashboard";
  };

  const pageTitle = getPageTitle();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return "AD";
    const email = user.email;
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      {/* Page Title and Breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          {pathname !== "/" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>{pageTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Section: Notifications and User Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </Link>

        {/* User Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage src={user?.photoURL || undefined} alt={user?.email || "User"} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Admin Account</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "admin@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex cursor-pointer items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void handleLogout();
              }}
              disabled={loading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{loading ? "Logging out..." : "Logout"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
