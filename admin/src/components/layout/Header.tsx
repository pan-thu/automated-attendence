import type { UserSummary } from "@/types";

interface HeaderProps {
  user: UserSummary | null;
  onLogout: () => Promise<void> | void;
}

export function Header({ user, onLogout }: HeaderProps) {
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
          onClick={onLogout}
          className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
