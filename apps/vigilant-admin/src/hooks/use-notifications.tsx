import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  severity: "info" | "success" | "warning" | "critical";
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  unread_count?: number;
}

const fetchNotifications = async (): Promise<NotificationsResponse> => {
  const response = await apiClient.get("/notifications");
  return response.data;
};

const markNotificationRead = async (id: number): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};

const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.post("/notifications/read-all");
};

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    NotificationsResponse,
    Error
  >({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    total: data?.total ?? 0,
    unreadCount,

    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,

    markRead: markReadMutation.mutate,
    markReadAsync: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,

    markAllRead: markAllReadMutation.mutate,
    markAllReadAsync: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}