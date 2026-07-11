/** @format */

import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDashboard,
  getMyKycSubmission,
  getSession,
  login,
  register,
  submitKyc,
} from "../api/services/auth.service";
import { setAuthToken } from "../api/axios.config";
import {
  clearAuthStorage,
  getMobileSession,
  saveMobileSession,
} from "../utils/auth.storage";
import {
  setCurrentUserId,
  setAuthToken as setLenderAuthToken,
} from "../services/api";
import { chatSocket } from "../services/socketService";
import type {
  AuthResponse,
  DashboardResponse,
  KycSubmission,
  LoginPayload,
  MobileRole,
  SessionResponse,
  SubmitKycPayload,
} from "../types/auth";

type SignUpPayload = {
  account: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: MobileRole;
  };
  kyc: SubmitKycPayload;
};

type MobileSession = {
  accessToken: string;
  user: AuthResponse["user"];
};

type AuthContextValue = {
  session: MobileSession | null;
  sessionStatus: SessionResponse | null;
  dashboard: DashboardResponse | null;
  kycSubmission: KycSubmission | null;
  authLoading: boolean;
  refreshing: boolean;
  error: string;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => void;
  refreshWorkspace: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export default AuthContext;

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [kycSubmission, setKycSubmission] = useState<KycSubmission | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function hydrateWorkspace(
    accessToken: string,
    user: AuthResponse["user"],
  ) {
    setAuthToken(accessToken);
    setLenderAuthToken(accessToken);
    setCurrentUserId(user?.uid);

    // Connect WebSocket with JWT token
    // Wrapped in try/catch so a socket error never breaks login
    try {
      chatSocket.connect(accessToken);
    } catch (e) {
      console.warn("[Auth] chatSocket.connect failed:", e);
    }

    const nextSessionStatus = await getSession();
    const dashboardPromise =
      nextSessionStatus.activeRole === "lender"
        ? getDashboard("lender")
        : nextSessionStatus.activeRole === "borrower"
          ? getDashboard("borrower")
          : Promise.resolve<DashboardResponse | null>(null);

    const [nextDashboard, nextKyc] = await Promise.all([
      dashboardPromise,
      getMyKycSubmission().catch(() => ({ submission: null })),
    ]);

    const nextSession = { accessToken, user: nextSessionStatus.user ?? user };

    setSession(nextSession);
    setSessionStatus(nextSessionStatus);
    setDashboard(nextDashboard);
    setKycSubmission(nextKyc.submission);
    await saveMobileSession(nextSession);
  }

  function resetWorkspaceState() {
    setAuthToken(null);
    setLenderAuthToken(null);
    setCurrentUserId(null);

    // Disconnect socket safely
    try {
      chatSocket.disconnect();
    } catch (e) {
      console.warn("[Auth] chatSocket.disconnect failed:", e);
    }

    // NOTE: intentionally NOT calling localDatabase.clearAll() here.
    // Clearing the local DB on every auth reset wipes chat history.
    // Only clear on explicit sign-out (see signOut below).

    setSession(null);
    setSessionStatus(null);
    setDashboard(null);
    setKycSubmission(null);
  }

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const storedSession = await getMobileSession();
        if (!storedSession.accessToken || !storedSession.user) {
          if (active) setAuthLoading(false);
          return;
        }
        await hydrateWorkspace(storedSession.accessToken, storedSession.user);
      } catch (nextError) {
        await clearAuthStorage();
        resetWorkspaceState();
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not restore your mobile session.",
          );
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  async function signIn(payload: LoginPayload) {
  try {
    setAuthLoading(true);
    setError("");
    console.log("[signIn] calling login API with:", payload.identifier);
    const response = await login(payload);
    console.log("[signIn] login success, uid:", response.user?.uid);
    await hydrateWorkspace(response.accessToken, response.user);
  } catch (nextError) {
    console.error("[signIn] error:", nextError); 
    
  }
}

  async function signUp(payload: SignUpPayload) {
    try {
      setAuthLoading(true);
      setError("");
      try {
        await register(payload.account);
      } catch (registerError) {
        const message =
          registerError instanceof Error ? registerError.message : "";
        if (!message.toLowerCase().includes("already exists")) {
          throw registerError;
        }
      }
      const loginResponse = await login({
        identifier: payload.account.email,
        password: payload.account.password,
        role: payload.account.role,
      });
      setAuthToken(loginResponse.accessToken);
      const kycResponse = await submitKyc(payload.kyc);
      setKycSubmission(kycResponse.submission);
      await hydrateWorkspace(loginResponse.accessToken, loginResponse.user);
    } catch (nextError) {
      await clearAuthStorage();
      resetWorkspaceState();
      setError(
        nextError instanceof Error ? nextError.message : "Sign up failed.",
      );
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

  async function refreshWorkspace() {
    if (!session) return;
    try {
      setRefreshing(true);
      setError("");
      await hydrateWorkspace(session.accessToken, session.user);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not refresh the workspace.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function signOut() {
    void clearAuthStorage();
    resetWorkspaceState();
    // Only clear local chat data on explicit logout
    try {
      const { localDatabase } = require("../services/localDatabase");
      localDatabase.clearAll();
    } catch (e) {
      console.warn("[Auth] localDatabase.clearAll failed:", e);
    }
    setError("");
    setAuthLoading(false);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session, sessionStatus, dashboard, kycSubmission,
      authLoading, refreshing, error,
      signIn, signUp, signOut, refreshWorkspace,
    }),
    [authLoading, dashboard, error, kycSubmission, refreshing, session, sessionStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}