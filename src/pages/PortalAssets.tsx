import { useQuery } from "@tanstack/react-query";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { AssignmentRecord } from "@/api/assets";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common/States";

export function PortalAssets() {
  const query = useQuery({
    queryKey: ["portal-assets"],
    queryFn: async () => { const result = await callApi<AssignmentRecord[]>({ url: endPoints.portal.assets, method: api_methods.GET }); if (!result.ok) throw new Error(result.message); return result.data ?? []; },
  });
  const rows = query.data?.filter((item) => !item.returned_at) ?? [];
  return <>
    <PageHeader title="My assets" description="Equipment currently assigned to you." />
    {query.isLoading ? <Spinner label="Loading your assets" /> : query.error ? <Card role="alert" className="p-5 text-danger">{query.error.message}</Card> : rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((assignment) => <Card key={assignment.id} className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{assignment.asset?.asset_tag ?? "Asset"}</h2><Badge variant="success">Assigned</Badge></div><p className="mt-2 text-sm text-muted-foreground">{[assignment.asset?.brand, assignment.asset?.model].filter(Boolean).join(" ")}</p><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Serial</dt><dd>{assignment.asset?.serial_no ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Due back</dt><dd>{assignment.due_return_date ?? "No due date"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Warranty</dt><dd>{assignment.asset?.warranty_end ?? "—"}</dd></div></dl></Card>)}</div> : <Card><EmptyState title="No assigned assets" description="Your current equipment will appear here." /></Card>}
  </>;
}
