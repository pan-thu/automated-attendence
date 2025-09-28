"use client";

import { Button } from "@/components/ui/button";

interface LoginFormProps {
  onSubmit?: () => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold">Admin Login</h2>
      <Button className="mt-4" type="button" onClick={onSubmit}>
        Login
      </Button>
    </div>
  );
}
