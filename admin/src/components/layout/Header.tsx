import { useState } from "react";

import type { UserSummary } from "@/types";

interface HeaderProps {
  user: UserSummary | null;
  onLogout: () => Promise<void> | void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await onLogout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold">Automated Attendance</h1>
        <p className="text-xs text-muted-foreground">Admin Dashboard</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {user ? <span>{user.email ?? "Admin"}</span> : null}
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={loading}
          className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}
