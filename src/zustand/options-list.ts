import { useQuery } from "@tanstack/react-query";
import type { Option } from "@/types";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";

export const useOptionsList = (resource: string) =>
  useQuery({
    queryKey: ["options", resource],
    queryFn: async () => {
      const result = await callApi<{ rows: Option[] }>({
        url: `${resource}/options`,
        method: "POST",
      });
      if (!result.ok) throw new Error(result.message);
      return result.data?.rows ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useRoleOptions = () => useOptionsList(endPoints.role.base);
