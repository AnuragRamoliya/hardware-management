import { useQuery } from "@tanstack/react-query";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { SoftwareAssignment } from "@/api/software";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common/States";

export function PortalSoftware() {
  const query = useQuery({
    queryKey: ["portal-software"],
    queryFn: async () => { const result = await callApi<SoftwareAssignment[]>({ url: endPoints.portal.software, method: api_methods.GET }); if (!result.ok) throw new Error(result.message); return result.data ?? []; },
  });
  const rows = query.data?.filter((item) => !item.revoked_at) ?? [];
  return <>
    <PageHeader title="My software" description="Software access currently assigned to you." />
    {query.isLoading ? <Spinner label="Loading your software" /> : query.error ? <Card role="alert" className="p-5 text-danger">{query.error.message}</Card> : rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((assignment) => <Card key={assignment.id} className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{assignment.software?.name ?? "Software"}</h2><Badge variant="success">Active</Badge></div><p className="mt-2 text-sm text-muted-foreground">{assignment.software?.category ?? ""} · {assignment.software?.license_type?.replaceAll("_", " ")}</p><p className="mt-4 text-xs text-muted-foreground">Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</p></Card>)}</div> : <Card><EmptyState title="No software access" description="Your assigned applications will appear here." /></Card>}
  </>;
}
