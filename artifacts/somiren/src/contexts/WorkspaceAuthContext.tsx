import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBase } from "@/lib/api";
import { readApiError } from "@/lib/api-error";
import { getActiveLanguage } from "@/lib/workspace-locale";

type WorkspaceProfile = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
};

type WorkspaceAuthContextValue = {
  profile: WorkspaceProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WorkspaceAuthContext = createContext<WorkspaceAuthContextValue | null>(null);

async function authRequest(path: string, options?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(getActiveLanguage() === "en"
      ? "Unable to connect. Check your connection and try again."
      : "Connexion impossible. Vérifiez votre connexion réseau et réessayez.");
  }
  if (!response.ok) {
    throw await readApiError(response);
  }
  return response.status === 204 ? null : response.json();
}

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pendingTwoFactorRef = useRef(false);
  const authGenerationRef = useRef(0);
  const currentProfileRef = useRef<WorkspaceProfile | null>(null);

  const beginAuthOperation = useCallback((pendingTwoFactor: boolean) => {
    authGenerationRef.current += 1;
    pendingTwoFactorRef.current = pendingTwoFactor;
    return authGenerationRef.current;
  }, []);

  const commitProfile = useCallback((nextProfile: WorkspaceProfile | null) => {
    if (currentProfileRef.current?.id !== nextProfile?.id) {
      authGenerationRef.current += 1;
    }
    currentProfileRef.current = nextProfile;
    setProfile(nextProfile);
  }, []);

  const refresh = useCallback(async () => {
    if (pendingTwoFactorRef.current) {
      setIsLoading(false);
      return;
    }
    const generation = authGenerationRef.current;
    try {
      const data = await authRequest("/auth/session");
      if (generation === authGenerationRef.current && !pendingTwoFactorRef.current) {
        setIsLoading(false);
        commitProfile(data.profile ?? null);
      }
    } catch {
      if (generation === authGenerationRef.current && !pendingTwoFactorRef.current) {
        setIsLoading(false);
        commitProfile(null);
      }
    } finally {
      if (generation === authGenerationRef.current && !pendingTwoFactorRef.current) {
        setIsLoading(false);
      }
    }
  }, [commitProfile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const refreshSession = () => void refresh();
    const interval = window.setInterval(refreshSession, 20_000);
    window.addEventListener("focus", refreshSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSession);
    };
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => {
      beginAuthOperation(false);
      queryClient.clear();
      commitProfile(null);
      setIsLoading(false);
    };
    window.addEventListener("workspace:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("workspace:unauthorized", handleUnauthorized);
  }, [beginAuthOperation, commitProfile, queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    beginAuthOperation(true);
    commitProfile(null);
    queryClient.clear();
    const generation = authGenerationRef.current;
    try {
      const data = await authRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (generation !== authGenerationRef.current || !pendingTwoFactorRef.current) {
        throw new Error(getActiveLanguage() === "en" ? "This sign-in attempt was cancelled." : "Cette tentative de connexion a été annulée.");
      }
      if (data.requiresTwoFactor === true) {
        return { requiresTwoFactor: true };
      }
      pendingTwoFactorRef.current = false;
      commitProfile(data.profile ?? null);
      return { requiresTwoFactor: false };
    } catch (error) {
      if (generation === authGenerationRef.current) pendingTwoFactorRef.current = false;
      throw error;
    }
  }, [beginAuthOperation, commitProfile, queryClient]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    const generation = beginAuthOperation(true);
    try {
      const data = await authRequest("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (generation !== authGenerationRef.current || !pendingTwoFactorRef.current) {
        throw new Error(getActiveLanguage() === "en" ? "This verification was cancelled." : "Cette vérification a été annulée.");
      }
      pendingTwoFactorRef.current = false;
      queryClient.clear();
      commitProfile(data.profile ?? null);
    } catch (error) {
      if (generation !== authGenerationRef.current) {
        throw new Error(getActiveLanguage() === "en" ? "This verification was cancelled." : "Cette vérification a été annulée.");
      }
      throw error;
    }
  }, [beginAuthOperation, commitProfile, queryClient]);

  const cancelTwoFactor = useCallback(async () => {
    const generation = beginAuthOperation(true);
    let requestError: unknown;
    try {
      await authRequest("/auth/2fa/cancel", { method: "POST" });
    } catch (error) {
      requestError = error;
    }
    if (generation !== authGenerationRef.current) {
      throw new Error(getActiveLanguage() === "en" ? "This cancellation was superseded by a newer action." : "Cette annulation a été remplacée par une action plus récente.");
    }
    pendingTwoFactorRef.current = false;
    queryClient.clear();
    commitProfile(null);
    setIsLoading(false);
    if (requestError) throw requestError;
  }, [beginAuthOperation, commitProfile, queryClient]);

  const logout = useCallback(async () => {
    const generation = beginAuthOperation(true);
    try {
      await authRequest("/auth/logout", { method: "POST" });
      if (generation !== authGenerationRef.current) {
        throw new Error(getActiveLanguage() === "en" ? "This sign-out was superseded by a newer action." : "Cette déconnexion a été remplacée par une action plus récente.");
      }
      pendingTwoFactorRef.current = false;
      queryClient.clear();
      commitProfile(null);
      setIsLoading(false);
    } catch (error) {
      if (generation === authGenerationRef.current) pendingTwoFactorRef.current = false;
      throw error;
    }
  }, [beginAuthOperation, commitProfile, queryClient]);

  const value = useMemo(
    () => ({ profile, isLoading, login, verifyTwoFactor, cancelTwoFactor, logout, refresh }),
    [profile, isLoading, login, verifyTwoFactor, cancelTwoFactor, logout, refresh],
  );

  return <WorkspaceAuthContext.Provider value={value}>{children}</WorkspaceAuthContext.Provider>;
}

export function useWorkspaceAuth() {
  const context = useContext(WorkspaceAuthContext);
  if (!context) throw new Error(getActiveLanguage() === "en"
    ? "useWorkspaceAuth must be used within WorkspaceAuthProvider"
    : "useWorkspaceAuth doit être utilisé dans WorkspaceAuthProvider");
  return context;
}