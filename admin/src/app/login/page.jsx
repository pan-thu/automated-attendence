"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { signIn, error, setError, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user && !loading) {
    redirect("/");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError?.(null);

    try {
      await signIn(email, password);
      redirect("/");
    } catch (err) {
      console.error("Failed to sign in", err);
      setError?.("Invalid credentials or insufficient permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Admin Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your admin account.</p>
          </div>
          <Link className="text-xs text-muted-foreground hover:text-foreground" href="/">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-muted-foreground">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="block text-sm font-medium text-muted-foreground">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
