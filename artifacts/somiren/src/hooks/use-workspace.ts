import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getApiBase } from "@/lib/api";
import { readApiError } from "@/lib/api-error";
import { mediaRequest } from "@/lib/private-media";

const POLL = 20_000;

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
    const error = await readApiError(res, `API Error: ${res.statusText}`);
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

export const useDashboard = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "dashboard"],
    queryFn: async () => api("/workspace/dashboard"),
    enabled,
  });
};

export const useCases = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "cases"],
    queryFn: async () => (await api("/workspace/cases")).cases,
    enabled,
  });
};

export const useCase = (id: string) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "case", id],
    queryFn: async () => api(`/workspace/cases/${id}`),
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: POLL,
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
      queryClient.invalidateQueries({ queryKey: ["workspace", "case", String(id)] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useTasks = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "tasks"],
    queryFn: async () => (await api("/workspace/tasks")).tasks,
    enabled,
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
      queryClient.invalidateQueries({ queryKey: ["workspace", "case"] });
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

export const useNotifications = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "notifications"],
    queryFn: async () => (await api("/workspace/notifications")).notifications,
    enabled,
    refetchInterval: POLL,
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

export const useVideoAccess = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "video-access"],
    queryFn: async () => api("/workspace/video-access"),
    enabled,
    refetchInterval: POLL,
  });
};

// New Hooks
export const useReceivedDocuments = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "documents", "received"],
    queryFn: async () => (await api("/workspace/documents/received")).documents,
    enabled,
    refetchInterval: POLL,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "documents"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "notifications"] });
    },
  });
};

export const useRequests = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "requests"],
    queryFn: async () => (await api("/workspace/requests")).requests,
    enabled,
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

export const useMeetings = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "meetings"],
    queryFn: async () => (await api("/workspace/meetings")).meetings,
    enabled,
    refetchInterval: POLL,
  });
};

export const useConversations = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "conversations"],
    queryFn: async () => (await api("/workspace/conversations")).conversations,
    enabled,
    refetchInterval: POLL,
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

export const useNotes = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "notes"],
    queryFn: async () => (await api("/workspace/notes")).notes,
    enabled,
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

export const useFinanceSummary = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "summary"],
    queryFn: async () => (await api("/workspace/me/financial-summary")).summary,
    enabled,
    refetchInterval: POLL,
  });
};

export const usePayments = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "payments"],
    queryFn: async () => (await api("/workspace/me/payments")).payments,
    enabled,
  });
};

export const useArrears = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "arrears"],
    queryFn: async () => (await api("/workspace/me/arrears")).arrears,
    enabled,
    refetchInterval: POLL,
  });
};

export const useRequestArrearTransfer = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => api(`/workspace/me/arrears/${id}/conditions-report`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "finance", "arrears"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", "notifications"] });
    },
  });
};

export const usePaymentRequirements = (enabled = true) => {
  const api = useApiClient();
  return useQuery({
    queryKey: ["workspace", "finance", "requirements"],
    queryFn: async () => (await api("/workspace/me/payment-requirements")).requirements,
    enabled,
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

const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const useMarkAllNotificationsRead = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/workspace/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", "notifications"] });
      qc.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

export const useConversationMessages = (id?: string | null) =>
  useQuery({
    queryKey: ["workspace", "conversations", id, "messages"],
    queryFn: async () => (await mediaRequest<any>(`/workspace/conversations/${id}/messages`)).messages as any[],
    enabled: !!id,
    refetchInterval: POLL,
  });

export const useSendConversationMessage = (id?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => mediaRequest<any>(`/workspace/conversations/${id}/messages`, json(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", "conversations"] });
      qc.invalidateQueries({ queryKey: ["workspace", "notifications"] });
      qc.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
    },
  });
};

// Admin
export const useAdminConversations = () =>
  useQuery({
    queryKey: ["admin", "conversations"],
    queryFn: async () => (await mediaRequest<any>("/admin/conversations")).conversations as any[],
    refetchInterval: POLL,
  });

export const useAdminCreateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => mediaRequest<any>("/admin/conversations", json(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "conversations"] }),
  });
};

export const useAdminMessages = (id?: string | null) =>
  useQuery({
    queryKey: ["admin", "conversations", id, "messages"],
    queryFn: async () => (await mediaRequest<any>(`/admin/conversations/${id}/messages`)).messages as any[],
    enabled: !!id,
    refetchInterval: POLL,
  });

export const useAdminSendMessage = (id?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => mediaRequest<any>(`/admin/conversations/${id}/messages`, json(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "conversations"] });
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
};

export const useAdminNotifications = () =>
  useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => (await mediaRequest<any>("/admin/notifications")).notifications as any[],
    refetchInterval: POLL,
  });

export const useAdminMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => mediaRequest<any>(`/admin/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });
};

export const useAdminMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => mediaRequest<any>("/admin/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });
};

export const useRequestSalaryTransfer = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => api(`/workspace/me/salary-records/${id}/conditions-report`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", "finance", "summary"] });
      qc.invalidateQueries({ queryKey: ["workspace", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["workspace", "notifications"] });
    },
  });
};

export type SenderService = { id: number; name: string; signature: string | null; isActive: boolean };

export const useAdminSenderServices = () =>
  useQuery({
    queryKey: ["admin", "sender-services"],
    queryFn: async () => (await mediaRequest<any>("/admin/sender-services")).services as SenderService[],
    refetchInterval: POLL,
  });

export const useAdminSaveSenderService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: any }) =>
      mediaRequest<any>(id ? `/admin/sender-services/${id}` : "/admin/sender-services", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sender-services"] }),
  });
};
