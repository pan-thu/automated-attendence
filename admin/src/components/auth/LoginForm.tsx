"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";

interface LoginFormProps {
  email: string;
  password: string;
  submitting: boolean;
  error?: string | null;
  onChange: (field: "email" | "password", value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function LoginForm({ email, password, submitting, error, onChange, onSubmit }: LoginFormProps) {
  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-muted-foreground">
        Email
        <input
          value={email}
          onChange={(event) => onChange("email", event.target.value)}
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block text-sm font-medium text-muted-foreground">
        Password
        <input
          value={password}
          onChange={(event) => onChange("password", event.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
