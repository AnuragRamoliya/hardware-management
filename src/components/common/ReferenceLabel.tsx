import { useQuery } from "@tanstack/react-query";
import { callApi } from "@/api/callApi";
import type { OptionItem } from "@/types/select";

export function ReferenceLabel({
  endpoint,
  id,
  relation,
}: {
  endpoint: string;
  id?: string | number | null;
  relation?: { name?: string; label?: string } | null;
}) {
  const query = useQuery({
    queryKey: ["reference-label", endpoint, id],
    enabled: id != null && id !== "",
    queryFn: async () => {
      const result = await callApi<{
        rows: OptionItem[];
        count: number;
        hasMore: boolean;
        page: number;
      }>({
        url: endpoint,
        method: "POST",
        body: { ids: [id], page: 1, limit: 1 },
        retried: false,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data?.rows[0]?.label ?? null;
    },
  });

  if (relation?.name || relation?.label) return relation.name ?? relation.label;
  if (id == null || id === "") return "—";
  if (query.isLoading) return "Loading…";
  return query.data ?? "—";
}
