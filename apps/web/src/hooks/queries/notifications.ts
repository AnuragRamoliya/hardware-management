import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";

export interface NotificationRecord {
  id: number;
  kind: string;
  title: string;
  message: string;
  read_at: string | null;
  createdAt: string;
}

export const notificationKeys = {
  all: ["notifications"] as const,
};

export function useNotificationsList() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const response = await callApi<NotificationRecord[]>({
        url: endPoints.notifications,
        method: "GET",
      });
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load notifications");
      }
      return response.data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await callApi({
        url: `${endPoints.notifications}/${id}/read`,
        method: "POST",
        body: {},
      });
      if (!response.ok) {
        throw new Error(response.message || "Unable to update notification");
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success("Notification marked as read");
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
