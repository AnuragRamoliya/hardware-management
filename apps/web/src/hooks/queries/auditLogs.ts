import { useQuery } from "@tanstack/react-query";
import { listResource } from "@/api/services";
import { endPoints } from "@/api/endpoint";
import type { ListQuery } from "@/types";

export interface AuditRecord {
  id: string | number;
  action?: string;
  module?: string;
  created_by_name?: string;
  createdAt?: string;
  description?: string;
  name?: string;
}

export const auditKeys = {
  all: ["audit-logs"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (query: ListQuery) => [...auditKeys.lists(), query] as const,
};

export function useAuditLogsList(query: ListQuery) {
  return useQuery({
    queryKey: auditKeys.list(query),
    queryFn: async () => {
      const response = await listResource<AuditRecord>(
        endPoints.audit.list,
        query,
      );
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load audit logs");
      }
      return response.data;
    },
  });
}
