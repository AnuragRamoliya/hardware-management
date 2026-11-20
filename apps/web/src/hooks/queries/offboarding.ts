import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { offboardingApi } from "@/api/offboarding";
import type { ListQuery } from "@/types";

export const offboardingKeys = {
  all: ["offboarding-cases"] as const,
  lists: () => [...offboardingKeys.all, "list"] as const,
  list: (query: ListQuery) => [...offboardingKeys.lists(), query] as const,
  details: () => [...offboardingKeys.all, "detail"] as const,
  detail: (id: number | string) => [...offboardingKeys.details(), id] as const,
  tasks: (query: ListQuery) => ["offboarding-tasks", query] as const,
  templates: (query: ListQuery) => ["offboarding-templates", query] as const,
  preview: (employeeId?: number) =>
    ["offboarding-preview", employeeId] as const,
  portal: ["portal-offboarding"] as const,
  preferences: ["notification-preferences"] as const,
};

export function useOffboardingCases(query: ListQuery) {
  return useQuery({
    queryKey: offboardingKeys.list(query),
    queryFn: async () => {
      const res = await offboardingApi.listCases(query);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useOffboardingCase(id: number | string) {
  return useQuery({
    queryKey: offboardingKeys.detail(id),
    queryFn: async () => {
      const res = await offboardingApi.getCase(id);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useOffboardingTasks(query: ListQuery) {
  return useQuery({
    queryKey: offboardingKeys.tasks(query),
    queryFn: async () => {
      const res = await offboardingApi.listTasks(query);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useOffboardingTemplates(query: ListQuery) {
  return useQuery({
    queryKey: offboardingKeys.templates(query),
    queryFn: async () => {
      const res = await offboardingApi.listTemplates(query);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useOffboardingPreview(employeeId?: number) {
  return useQuery({
    queryKey: offboardingKeys.preview(employeeId),
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await offboardingApi.preview(employeeId);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function usePortalOffboarding() {
  return useQuery({
    queryKey: offboardingKeys.portal,
    queryFn: async () => {
      const res = await offboardingApi.getPortalSummary();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useInitiateOffboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: number;
      last_working_day: string;
      reason?: string;
      notes?: string;
      template_id?: number;
      handover_user_id?: number;
    }) => {
      const res = await offboardingApi.initiate(payload);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Offboarding case initiated successfully");
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelOffboardingCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: number | string;
      reason?: string;
    }) => {
      const res = await offboardingApi.cancelCase(id, reason);
      if (!res.ok) throw new Error(res.message);
    },
    onSuccess: (_, { id }) => {
      toast.success("Offboarding case cancelled");
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({
        queryKey: offboardingKeys.detail(id),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteOffboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      notes,
      condition,
    }: {
      taskId: number;
      notes?: string;
      condition?: string;
    }) => {
      const res = await offboardingApi.completeTask(taskId, {
        notes,
        condition,
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Task completed");
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["offboarding-tasks"] });
      if (data?.case_id) {
        void queryClient.invalidateQueries({
          queryKey: offboardingKeys.detail(data.case_id),
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useWaiveOffboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      notes,
    }: {
      taskId: number;
      notes?: string;
    }) => {
      const res = await offboardingApi.waiveTask(taskId, notes);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Task waived");
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["offboarding-tasks"] });
      if (data?.case_id) {
        void queryClient.invalidateQueries({
          queryKey: offboardingKeys.detail(data.case_id),
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkExceptionOffboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      notes,
    }: {
      taskId: number;
      notes?: string;
    }) => {
      const res = await offboardingApi.markExceptionTask(taskId, notes);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Task marked as exception");
      void queryClient.invalidateQueries({ queryKey: offboardingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["offboarding-tasks"] });
      if (data?.case_id) {
        void queryClient.invalidateQueries({
          queryKey: offboardingKeys.detail(data.case_id),
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: offboardingKeys.preferences,
    queryFn: async () => {
      const res = await offboardingApi.getNotificationPreferences();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      categories?: Partial<{
        requests: boolean;
        assets: boolean;
        credentials: boolean;
        offboarding: boolean;
        system: boolean;
      }>;
      channels?: Partial<{
        toast: boolean;
        sound: boolean;
      }>;
    }) => {
      const res = await offboardingApi.updateNotificationPreferences(payload);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Preferences updated");
      void queryClient.invalidateQueries({
        queryKey: offboardingKeys.preferences,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
