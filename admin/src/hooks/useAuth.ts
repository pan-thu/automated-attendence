"use client";

import { useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  // Add logic to interact with Firebase Auth
  return { user };
}
