"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <Header onLogout={signOut} user={user} />
        <main className="flex-1 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
