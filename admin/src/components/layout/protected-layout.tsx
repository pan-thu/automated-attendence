"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading, checkingClaims } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth state is fully resolved
    if (!loading && !checkingClaims && !user) {
      router.replace("/login");
    }
  }, [loading, user, checkingClaims, router]);

  // Show loading state consistently to avoid hydration mismatches
  const isLoading = loading || checkingClaims;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Don't render children until user is confirmed
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}
