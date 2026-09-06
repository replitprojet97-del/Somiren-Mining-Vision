import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getApiBase } from "@/lib/api";

const fetchWithAuth = async (url: string, token: string | null, options?: RequestInit) => {
  const res = await fetch(`${getApiBase()}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const error = new Error(payload.error || `API Error: ${res.statusText}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

const useApiClient = () => {
  return useCallback(async (url: string, options?: RequestInit) => {
    return fetchWithAuth(url, null, options);
  }, []);
};

const normalizeCase = (item: any) => ({
  ...item,
  priority: String(item.priority ?? "normal").toUpperCase(),
  status: String(item.status ?? "active").toUpperCase(),
  dueDate: item.dueDate ?? item.createdAt,
});

const normalizeTask = (item: any) => ({
  ...item,
  status: item.status === "completed" ? "DONE" : "PENDING",
  priority: String(item.priority ?? "normal").toUpperCase(),
  dueDate: item.dueAt ?? item.createdAt,
});

export const useMe = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "me"],
    queryFn: async () => {
      const data = await api("/workspace/me");
      return { ...data.profile, name: data.profile.fullName, permissions: data.permissions };
    },
    retry: false,
  });
};

export const useDashboard = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "dashboard"],
    queryFn: async () => {
      const data = await api("/workspace/dashboard");
      return {
        summary: {
          activeCases: data.counts.cases,
          pendingTasks: data.counts.openTasks,
          unreadNotifications: data.counts.unreadNotifications,
        },
        recentCases: data.urgentCases.map(normalizeCase),
        priorityTasks: [...data.todayWork, ...data.nextItems]
          .filter((task, index, all) => all.findIndex((item) => item.id === task.id) === index)
          .map(normalizeTask)
          .slice(0, 6),
      };
    },
  });
};

export const useCases = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "cases"],
    queryFn: async () => (await api("/workspace/cases")).cases.map(normalizeCase),
  });
};

export const useCase = (id: string) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "cases", id],
    queryFn: async () => {
      const data = await api(`/workspace/cases/${id}`);
      return { ...data, case: normalizeCase(data.case), tasks: data.tasks.map(normalizeTask) };
    },
    enabled: !!id,
  });
};

export const useUpdateCase = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/workspace/cases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "cases"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "cases", id] });
    },
  });
};

export const useTasks = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "tasks"],
    queryFn: async () => (await api("/workspace/tasks")).tasks.map(normalizeTask),
  });
};

export const useUpdateTask = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api(`/workspace/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          status: data.status === "DONE" ? "completed" : data.status === "PENDING" ? "todo" : data.status,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useDocuments = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "documents"],
    queryFn: async () => (await api("/workspace/documents")).documents.map((document: any) => ({
      ...document,
      category: "Dossier",
      format: document.contentType?.split("/").pop() ?? "document",
      size: "Stockage privé",
      uploadedAt: document.createdAt,
    })),
  });
};

export const useNotifications = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "notifications"],
    queryFn: async () => (await api("/workspace/notifications")).notifications.map((notification: any) => ({
      ...notification,
      message: notification.body,
      type: "INFO",
    })),
  });
};

export const useMarkNotificationRead = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/workspace/notifications/${id}/read`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useActivity = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "activity"],
    queryFn: async () => (await api("/workspace/activity")).activity.map((activity: any) => ({
      ...activity,
      timestamp: activity.createdAt,
      description: activity.action.replaceAll("_", " "),
    })),
  });
};

export const useVideoAccess = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "video-access"],
    queryFn: async () => {
      const data = await api("/workspace/video-access");
      return { ...data, allowed: data.authorized };
    },
  });
};
