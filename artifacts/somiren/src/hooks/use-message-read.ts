import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaRequest } from "@/lib/private-media";

const POLL = 20_000;
const unreadMessageCountKey = ["workspace", "messages", "unread-count"] as const;

export const useUnreadMessageCount = (enabled = true) =>
  useQuery({
    queryKey: unreadMessageCountKey,
    queryFn: async () => (await mediaRequest<{ count: number }>("/workspace/messages/unread-count")).count,
    enabled,
    refetchInterval: POLL,
  });

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, lastReadMessageId }: { conversationId: string | number; lastReadMessageId: number }) =>
      mediaRequest<{ updated: boolean; lastReadMessageId: number }>(`/workspace/conversations/${conversationId}/read`, {
        method: "PATCH",
        body: JSON.stringify({ lastReadMessageId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadMessageCountKey });
      queryClient.invalidateQueries({ queryKey: ["workspace", "conversations"] });
    },
  });
};