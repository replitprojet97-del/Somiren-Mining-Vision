import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBase } from "@/lib/api";

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WorkspaceAuthContext = createContext<WorkspaceAuthContextValue | null>(null);

async function authRequest(path: string, options?: RequestInit) {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || "Une erreur est survenue.") as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authRequest("/auth/session");
      setProfile(data.profile);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
      setProfile(null);
    };
    window.addEventListener("workspace:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("workspace:unauthorized", handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    queryClient.clear();
    setProfile(data.profile);
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authRequest("/auth/logout", { method: "POST" });
    } finally {
      queryClient.clear();
      setProfile(null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ profile, isLoading, login, logout, refresh }),
    [profile, isLoading, login, logout, refresh],
  );

  return <WorkspaceAuthContext.Provider value={value}>{children}</WorkspaceAuthContext.Provider>;
}

export function useWorkspaceAuth() {
  const context = useContext(WorkspaceAuthContext);
  if (!context) throw new Error("useWorkspaceAuth must be used within WorkspaceAuthProvider");
  return context;
}