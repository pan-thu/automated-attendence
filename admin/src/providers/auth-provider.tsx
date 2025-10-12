"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getFirebaseAuth } from "@/lib/firebase/config";
import type { UserSummary } from "@/types";

type FirebaseAuthModule = typeof import("firebase/auth");

type AuthContextValue = {
  user: UserSummary | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  checkingClaims: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setError?: (value: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingClaims, setCheckingClaims] = useState<boolean>(false);

  const [authModule, setAuthModule] = useState<FirebaseAuthModule | null>(null);
  const [firebaseAuth, setFirebaseAuthInstance] = useState<ReturnType<typeof getFirebaseAuth> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function prepareAuth() {
      try {
        const authMod = await import("firebase/auth");
        const authInstance = getFirebaseAuth();

        if (!mounted) return;

        setAuthModule(authMod);
        setFirebaseAuthInstance(authInstance);
      } catch (err) {
        console.error("Unable to initialize Firebase Auth", err);
        if (mounted) {
          setError("Authentication is unavailable. Check Firebase configuration.");
          setLoading(false);
        }
      }
    }

    prepareAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!firebaseAuth || !authModule) {
        throw new Error("Auth is not ready yet");
      }
      setError(null);
      setCheckingClaims(true);
      await authModule.signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    [authModule, firebaseAuth]
  );

  const signOut = useCallback(async () => {
    if (!firebaseAuth || !authModule) return;
    await authModule.signOut(firebaseAuth);
    setUser(null);
    setCheckingClaims(false);
  }, [authModule, firebaseAuth]);

  useEffect(() => {
    if (!firebaseAuth || !authModule) {
      return;
    }

    const unsubscribe = authModule.onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        setCheckingClaims(false);
        return;
      }

      try {
        const tokenResult = await currentUser.getIdTokenResult(true);
        const role = tokenResult.claims?.role;

        if (role === "admin") {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName ?? null,
          });
        } else {
          await authModule.signOut(firebaseAuth);
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to resolve auth claims", err);
        setError("Authentication check failed. Please try again.");
        setUser(null);
        await authModule.signOut(firebaseAuth);
      } finally {
        setLoading(false);
        setCheckingClaims(false);
      }
    });

    return () => unsubscribe();
  }, [authModule, firebaseAuth]);

  const isAdmin = useMemo(() => Boolean(user), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      checkingClaims,
      isAdmin,
      signIn,
      signOut,
      error,
      setError,
    }),
    [user, loading, checkingClaims, isAdmin, signIn, signOut, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
