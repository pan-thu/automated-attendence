"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, loading, user, checkingClaims } = useAuth();

  if (loading || checkingClaims) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={signOut} user={user} />
      <div className="grid min-h-[calc(100vh-72px)] grid-cols-[200px_1fr]">
        <Sidebar />
        <main className="bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
