"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/config";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [authModule, setAuthModule] = useState(null);
  const [firebaseAuth, setFirebaseAuth] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function prepareAuth() {
      try {
        const [{ getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }] = await Promise.all([
          import("firebase/auth"),
        ]);
        const authInstance = await getFirebaseAuth();

        if (!mounted) return;

        setAuthModule({ onAuthStateChanged, signInWithEmailAndPassword, signOut });
        setFirebaseAuth(authInstance);
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
    async (email, password) => {
      if (!firebaseAuth || !authModule) {
        throw new Error("Auth is not ready yet");
      }
      setError(null);
      await authModule.signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    [authModule, firebaseAuth]
  );

  const signOut = useCallback(async () => {
    if (!firebaseAuth || !authModule) return;
    await authModule.signOut(firebaseAuth);
    setUser(null);
  }, [authModule, firebaseAuth]);

  useEffect(() => {
    if (!firebaseAuth || !authModule) {
      return;
    }

    const unsubscribe = authModule.onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await currentUser.getIdTokenResult(true);
        const role = tokenResult.claims?.role;

        if (role === "admin") {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
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
      }
    });

    return () => unsubscribe();
  }, [authModule, firebaseAuth]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: Boolean(user),
      signIn,
      signOut,
      error,
      setError,
    }),
    [user, loading, signIn, signOut, error]
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
