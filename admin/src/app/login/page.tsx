"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginContent() {
  const { signIn, error, setError, loading, user } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => {
    const redirectParam = searchParams?.get("redirect");
    return redirectParam ? decodeURIComponent(redirectParam) : "/";
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      router.replace(callbackUrl);
    }
  }, [user, loading, callbackUrl, router]);

  async function handleSubmit() {
    setSubmitting(true);
    setError?.(null);

    try {
      await signIn(email, password);
      router.replace(callbackUrl);
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

        <LoginForm
          email={email}
          password={password}
          submitting={submitting}
          error={error}
          onChange={(field, value) => {
            if (field === "email") {
              setEmail(value);
            } else {
              setPassword(value);
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        />

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Trouble signing in? Contact your system administrator.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
