import { listResource } from "@/api/services";
import { endPoints } from "@/api/endpoint";
import type { ListQuery } from "@/types";

export interface AuditItem {
  id: string | number;
  module: string;
  action: string;
  created_by_name?: string;
  createdAt: string;
  description: string;
}

export function getAuditListApi(query: ListQuery) {
  return listResource<AuditItem>(endPoints.audit.list, query);
}
