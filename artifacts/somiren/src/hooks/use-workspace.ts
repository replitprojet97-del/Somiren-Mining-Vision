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
    if (res.status === 401) window.dispatchEvent(new Event("workspace:unauthorized"));
    throw error;
  }
  return res.json();
};

const useApiClient = () => {
  return useCallback(async (url: string, options?: RequestInit) => {
    return fetchWithAuth(url, null, options);
  }, []);
};

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
    queryFn: async () => api("/workspace/dashboard"),
  });
};

export const useCases = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "cases"],
    queryFn: async () => (await api("/workspace/cases")).cases,
  });
};

export const useCase = (id: string) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "cases", id],
    queryFn: async () => api(`/workspace/cases/${id}`),
    enabled: !!id,
  });
};

export const useUpdateCase = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api(`/workspace/cases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "cases"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "cases", id] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useTasks = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "tasks"],
    queryFn: async () => (await api("/workspace/tasks")).tasks,
  });
};

export const useUpdateTask = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api(`/workspace/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
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
    queryFn: async () => (await api("/workspace/documents")).documents,
  });
};

export const useNotifications = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "notifications"],
    queryFn: async () => (await api("/workspace/notifications")).notifications,
  });
};

export const useMarkNotificationRead = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
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
    queryFn: async () => (await api("/workspace/activity")).activity,
  });
};

export const useVideoAccess = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "video-access"],
    queryFn: async () => api("/workspace/video-access"),
  });
};

// New Hooks
export const useReceivedDocuments = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "documents", "received"],
    queryFn: async () => (await api("/workspace/documents/received")).documents,
  });
};

export const useUpdateReceivedDocument = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api(`/workspace/documents/received/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "documents", "received"] }),
  });
};

export const useRequests = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "requests"],
    queryFn: async () => (await api("/workspace/requests")).requests,
  });
};

export const useUpdateRequest = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api(`/workspace/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "requests"] }),
  });
};

export const useMeetings = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "meetings"],
    queryFn: async () => (await api("/workspace/meetings")).meetings,
  });
};

export const useConversations = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "conversations"],
    queryFn: async () => (await api("/workspace/conversations")).conversations,
  });
};

export const useCreateConversation = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api(`/workspace/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "conversations"] }),
  });
};

export const useNotes = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "notes"],
    queryFn: async () => (await api("/workspace/notes")).notes,
  });
};

export const useCreateNote = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api(`/workspace/notes`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "notes"] }),
  });
};

export const useUpdateNote = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      api(`/workspace/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "notes"] }),
  });
};

export const useContacts = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "contacts"],
    queryFn: async () => (await api("/workspace/contacts")).contacts,
  });
};

export const useFinanceSummary = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "summary"],
    queryFn: async () => (await api("/workspace/me/financial-summary")).summary,
  });
};

export const usePayments = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "payments"],
    queryFn: async () => (await api("/workspace/me/payments")).payments,
  });
};

export const useArrears = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "arrears"],
    queryFn: async () => (await api("/workspace/me/arrears")).arrears,
  });
};

export const usePaymentRequirements = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "requirements"],
    queryFn: async () => (await api("/workspace/me/payment-requirements")).requirements,
  });
};

export const useSessions = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "sessions"],
    queryFn: async () => (await api("/workspace/sessions")).sessions,
  });
};

export const useRevokeSession = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      api(`/workspace/sessions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace", "sessions"] }),
  });
};
