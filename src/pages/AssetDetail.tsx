import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/common/States";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import { assetsApi, type AssetRecord } from "@/api/assets";
import { ASSET_STATUS, getAssetStatusLabel } from "@/utils/constants";

const tabs = ["Overview", "Assignment history", "Maintenance", "Accessories", "Activity"] as const;
type Tab = (typeof tabs)[number];

export function AssetDetail() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Overview");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["asset", id],
    queryFn: async () => { const result = await assetsApi.get(id); if (!result.ok || !result.data) throw new Error(result.message || "Asset not found"); return result.data; },
  });
  const history = useQuery({
    queryKey: ["asset-history", id],
    queryFn: async () => { const result = await assetsApi.history(Number(id)); if (!result.ok) throw new Error(result.message); return result.data ?? []; },
    enabled: tab === "Assignment history",
  });
  const maintenance = useQuery({
    queryKey: ["asset-maintenance", id],
    queryFn: async () => { const result = await callApi<{ rows: Record<string, unknown>[]; count: number }, { currentPage: number; itemsPerPage: number; filters: { asset_id: number } }>({ url: endPoints.asset.maintenance.list, method: api_methods.POST, body: { currentPage: 1, itemsPerPage: 50, filters: { asset_id: Number(id) } } }); if (!result.ok) throw new Error(result.message); return result.data?.rows ?? []; },
    enabled: tab === "Maintenance",
  });
  const activity = useQuery({
    queryKey: ["asset-activity", id],
    queryFn: async () => { const result = await callApi<{ rows: Record<string, unknown>[]; count: number }, { id: number }>({ url: "asset/activity", method: api_methods.POST, body: { id: Number(id) } }); if (!result.ok) throw new Error(result.message); return result.data?.rows ?? []; },
    enabled: tab === "Activity",
  });
  const item = query.data;
  const setState = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Asset not found");
      const response = await assetsApi.update({ id: item.id, asset_status: item.asset_status === 5 ? 1 : 5 } as Partial<AssetRecord> & { id: string | number });
      if (!response.ok) throw new Error(response.message);
    },
    onSuccess: () => { toast.success("Asset status updated"); void client.invalidateQueries({ queryKey: ["asset", id] }); },
    onError: (error) => toast.error(error.message),
  });
  if (query.isLoading) return <Spinner label="Loading asset" />;
  if (!item) return <Card className="p-8 text-danger">{query.error?.message ?? "Asset not found"}</Card>;
  const state = ASSET_STATUS.find((entry) => entry.value === item.asset_status);
  return <>
    <PageHeader title={item.asset_tag} description={[item.brand, item.model, item.serial_no].filter(Boolean).join(" · ")} breadcrumbs={[{ label: "Assets", to: "/assets" }, { label: item.asset_tag }]} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setState.mutate()}>{item.asset_status === 5 ? "Restore" : "Retire"}</Button><Badge variant={state?.tone === "success" ? "success" : state?.tone === "warning" ? "warning" : state?.tone === "muted" ? "muted" : "info"}>{getAssetStatusLabel(item.asset_status)}</Badge></div>} />
    <div className="mb-5 flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Asset details">{tabs.map((name) => <button key={name} role="tab" aria-selected={tab === name} className={"min-h-11 shrink-0 border-b-2 px-4 text-sm " + (tab === name ? "border-primary font-medium" : "border-transparent text-muted-foreground")} onClick={() => setTab(name)}>{name}</button>)}</div>
    {tab === "Overview" ? <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><h2 className="text-sm font-semibold">Asset details</h2></CardHeader><CardContent><dl className="grid grid-cols-2 gap-4 text-sm">{[["Serial", item.serial_no], ["Condition", item.condition], ["Brand", item.brand], ["Model", item.model], ["Purchase date", item.purchase_date], ["Purchase cost", item.purchase_cost], ["Warranty end", item.warranty_end], ["Location", item.location_id]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1">{String(value ?? "—")}</dd></div>)}</dl>{item.notes && <p className="mt-5 text-sm text-muted-foreground">{item.notes}</p>}</CardContent></Card><Card><CardHeader><h2 className="text-sm font-semibold">Current assignment</h2></CardHeader><CardContent>{item.current_assignment?.employee ? <p className="text-sm">{item.current_assignment.employee.first_name} {item.current_assignment.employee.last_name} <span className="text-muted-foreground">({item.current_assignment.employee.employee_code})</span></p> : <EmptyState title="Available" description="This asset has no current assignee." />}</CardContent></Card></div>
    : tab === "Assignment history" ? <Records state={history} rows={(history.data ?? []) as unknown as Record<string, unknown>[]} empty="No assignment history" />
    : tab === "Maintenance" ? <Records state={maintenance} rows={maintenance.data ?? []} empty="No maintenance records" />
    : tab === "Accessories" ? <Records state={{ isLoading: false, error: null } as never} rows={(item.accessories ?? []) as unknown as Record<string, unknown>[]} empty="No accessories attached" />
    : <Records state={activity} rows={activity.data ?? []} empty="No activity yet" />}
  </>;
}

function Records({ state, rows, empty }: { state: { isLoading?: boolean; error?: Error | null }; rows: Record<string, unknown>[]; empty: string }) {
  if (state.isLoading) return <Spinner label="Loading records" />;
  if (state.error) return <Card role="alert" className="p-5 text-sm text-danger">{state.error.message}</Card>;
  if (!rows.length) return <Card><EmptyState title={empty} description="Records will appear here as this asset is used." /></Card>;
  return <div className="space-y-3">{rows.map((row, index) => <Card key={String(row.id ?? index)} className="p-4"><p className="text-sm font-medium">{String(row.action ?? row.issue ?? row.asset_tag ?? ("Assignment " + String(row.id ?? "")))}</p><p className="mt-1 text-xs text-muted-foreground">{String(row.assigned_at ?? row.sent_at ?? row.createdAt ?? row.returned_at ?? "")}</p>{Boolean(row.note) && <p className="mt-2 text-sm">{String(row.note)}</p>}</Card>)}</div>;
}
