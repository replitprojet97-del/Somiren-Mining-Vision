import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiBase } from "@/lib/api";

const fetchWithAuth = async (url: string, options?: RequestInit) => {
  const res = await fetch(`${getApiBase()}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
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
  return useQuery({
    queryKey: ["workspace", "me"],
    queryFn: async () => {
      const data = await fetchWithAuth("/workspace/me");
      return { ...data.profile, name: data.profile.fullName, permissions: data.permissions };
    },
    retry: false,
  });
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ["workspace", "dashboard"],
    queryFn: async () => {
      const data = await fetchWithAuth("/workspace/dashboard");
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
  return useQuery({
    queryKey: ["workspace", "cases"],
    queryFn: async () => (await fetchWithAuth("/workspace/cases")).cases.map(normalizeCase),
  });
};

export const useCase = (id: string) => {
  return useQuery({
    queryKey: ["workspace", "cases", id],
    queryFn: async () => {
      const data = await fetchWithAuth(`/workspace/cases/${id}`);
      return { ...data, case: normalizeCase(data.case), tasks: data.tasks.map(normalizeTask) };
    },
    enabled: !!id,
  });
};

export const useUpdateCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchWithAuth(`/workspace/cases/${id}`, {
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
  return useQuery({
    queryKey: ["workspace", "tasks"],
    queryFn: async () => (await fetchWithAuth("/workspace/tasks")).tasks.map(normalizeTask),
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchWithAuth(`/workspace/tasks/${id}`, {
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
  return useQuery({
    queryKey: ["workspace", "documents"],
    queryFn: async () => (await fetchWithAuth("/workspace/documents")).documents.map((document: any) => ({
      ...document,
      category: "Dossier",
      format: document.contentType?.split("/").pop() ?? "document",
      size: "Stockage privé",
      uploadedAt: document.createdAt,
    })),
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: ["workspace", "notifications"],
    queryFn: async () => (await fetchWithAuth("/workspace/notifications")).notifications.map((notification: any) => ({
      ...notification,
      message: notification.body,
      type: "INFO",
    })),
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchWithAuth(`/workspace/notifications/${id}/read`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useActivity = () => {
  return useQuery({
    queryKey: ["workspace", "activity"],
    queryFn: async () => (await fetchWithAuth("/workspace/activity")).activity.map((activity: any) => ({
      ...activity,
      timestamp: activity.createdAt,
      description: activity.action.replaceAll("_", " "),
    })),
  });
};

export const useVideoAccess = () => {
  return useQuery({
    queryKey: ["workspace", "video-access"],
    queryFn: async () => {
      const data = await fetchWithAuth("/workspace/video-access");
      return { ...data, allowed: data.authorized };
    },
  });
};
