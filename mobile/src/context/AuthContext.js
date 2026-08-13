import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await authApi.getSession();
      setUser(res.authenticated ? res.user : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setCheckingSession(false));
  }, [refreshSession]);

  const signIn = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.user);
    return res.user;
  }, []);

  const signUp = useCallback(async ({ name, email, phone, password }) => {
    const res = await authApi.register({ name, email, phone, password });
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, checkingSession, signIn, signUp, signOut, refreshSession }),
    [user, checkingSession, signIn, signUp, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
