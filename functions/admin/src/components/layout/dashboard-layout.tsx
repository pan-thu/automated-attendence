"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          isCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header onLogout={signOut} user={user} />
        <main className="flex-1 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
