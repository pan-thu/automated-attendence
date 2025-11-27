"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function LoginContent() {
  const { signIn, error, setError, loading, user } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
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

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-[448px] space-y-6">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <Image
              src="/logo-dark.svg"
              alt="AttenDesk"
              width={80}
              height={80}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AttenDesk</h1>
          <p className="mt-2 text-sm text-gray-600">Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your admin account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors({ ...validationErrors, email: undefined });
                    }}
                    className={`pl-10 h-11 ${validationErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={submitting}
                    required
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? "email-error" : undefined}
                  />
                </div>
                {validationErrors.email && (
                  <p id="email-error" className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors({ ...validationErrors, password: undefined });
                    }}
                    className={`pl-10 pr-10 h-11 ${validationErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={submitting}
                    required
                    aria-invalid={!!validationErrors.password}
                    aria-describedby={validationErrors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p id="password-error" className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t pt-6">
            {/* SSL Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Secured with SSL encryption</span>
            </div>

            {/* Support Text */}
            <p className="text-center text-xs text-gray-500">
              Having trouble? Contact your system administrator
            </p>
          </CardFooter>
        </Card>

        {/* Copyright */}
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} AttenDesk. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center animate-pulse">
            <Image
              src="/logo-dark.svg"
              alt="AttenDesk"
              width={80}
              height={80}
            />
          </div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}