import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/common/States";
import { softwareApi, type SoftwareAssignment } from "@/api/software";
import { api_methods } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import { TableFilterPanel } from "@/components/common/TableFilters/TableFilterPanel";
import type { FilterField, FilterValues } from "@/components/common/TableFilters/types";

const tabs = ["Overview", "Licenses", "Assigned users", "Activity"] as const;
type Tab = (typeof tabs)[number];
const licenseFilters: FilterField[] = [
  { key: "expiry_date", label: "Expiry date", type: "daterange" },
  { key: "has_available_seats", label: "Has available seats", type: "boolean" },
];

export function SoftwareDetail() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseFilterValue, setLicenseFilterValue] = useState<FilterValues>({});
  const [licenseForm, setLicenseForm] = useState({ license_key: "", seats_total: "1", purchase_date: "", expiry_date: "" });
  const softwareId = Number(id);
  const software = useQuery({ queryKey: ["software", "detail", id], queryFn: async () => { const result = await softwareApi.get(id); if (!result.ok || !result.data) throw new Error(result.message || "Software not found"); return result.data; } });
  const licenses = useQuery({ queryKey: ["software-licenses", id, licenseFilterValue], enabled: tab === "Licenses", queryFn: async () => { const result = await softwareApi.licenses({ currentPage: 1, itemsPerPage: 100, sortBy: [], filters: { ...licenseFilterValue, software_id: softwareId } }); if (!result.ok) throw new Error(result.message); return result.data?.rows ?? []; } });
  const usage = useQuery({ queryKey: ["software-usage", id], enabled: tab === "Assigned users", queryFn: async () => { const result = await softwareApi.usage(softwareId); if (!result.ok) throw new Error(result.message); return result.data ?? []; } });
  const activity = useQuery({ queryKey: ["software-activity", id], enabled: tab === "Activity", queryFn: async () => { const result = await callApi<{ rows: Record<string, unknown>[]; count: number }, { id: number }>({ url: "software/activity", method: api_methods.POST, body: { id: softwareId } }); if (!result.ok) throw new Error(result.message); return result.data?.rows ?? []; } });
  const addLicense = useMutation({
    mutationFn: async () => { const result = await softwareApi.addLicense({ software_id: softwareId, license_key: licenseForm.license_key || undefined, seats_total: Number(licenseForm.seats_total), purchase_date: licenseForm.purchase_date || undefined, expiry_date: licenseForm.expiry_date || undefined }); if (!result.ok) throw new Error(result.message); },
    onSuccess: () => { toast.success("License added"); setLicenseOpen(false); setLicenseForm({ license_key: "", seats_total: "1", purchase_date: "", expiry_date: "" }); void client.invalidateQueries({ queryKey: ["software-licenses", id] }); void client.invalidateQueries({ queryKey: ["software", id] }); },
    onError: (error) => toast.error(error.message),
  });
  const revoke = useMutation({
    mutationFn: async (assignment: SoftwareAssignment) => { const result = await softwareApi.revoke(Number(assignment.id)); if (!result.ok) throw new Error(result.message); },
    onSuccess: () => { toast.success("Access revoked"); void client.invalidateQueries({ queryKey: ["software-usage", id] }); void client.invalidateQueries({ queryKey: ["software-licenses", id] }); },
    onError: (error) => toast.error(error.message),
  });
  if (software.isLoading) return <Spinner label="Loading software" />;
  if (!software.data) return <Card role="alert" className="p-6 text-danger">{software.error?.message ?? "Software not found"}</Card>;
  const item = software.data;
  return <>
    <PageHeader title={item.name} description={item.category + " · " + item.license_type.replaceAll("_", " ")} breadcrumbs={[{ label: "Software", to: "/software" }, { label: item.name }]} />
    <div className="mb-5 flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Software details">{tabs.map((name) => <button key={name} role="tab" aria-selected={tab === name} className={"min-h-11 shrink-0 border-b-2 px-4 text-sm " + (tab === name ? "border-primary font-medium" : "border-transparent text-muted-foreground")} onClick={() => setTab(name)}>{name}</button>)}</div>
    {tab === "Overview" ? <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><h2 className="text-sm font-semibold">Software details</h2></CardHeader><CardContent><dl className="space-y-3 text-sm">{[["Category", item.category], ["License type", item.license_type], ["Vendor", item.vendor_id], ["Cost", item.cost], ["Billing cycle", item.billing_cycle], ["Renewal date", item.renewal_date], ["Seats used", item.seats_used], ["Seats available", item.seats_available]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl>{item.notes && <p className="mt-5 text-sm text-muted-foreground">{item.notes}</p>}</CardContent></Card><Card><CardHeader><h2 className="text-sm font-semibold">License overview</h2><Button size="sm" onClick={() => setLicenseOpen(true)}><Plus className="h-4 w-4" />Add license</Button></CardHeader><CardContent><p className="text-sm text-muted-foreground">Manage keys and seat limits in the Licenses tab.</p></CardContent></Card></div>
    : tab === "Licenses" ? <Card><CardHeader><h2 className="text-sm font-semibold">Licenses</h2><div className="flex gap-2"><TableFilterPanel config={licenseFilters} value={licenseFilterValue} onApply={setLicenseFilterValue} onReset={() => setLicenseFilterValue({})} /><Button size="sm" onClick={() => setLicenseOpen(true)}><Plus className="h-4 w-4" />Add license</Button></div></CardHeader><CardContent>{licenses.isLoading ? <Spinner label="Loading licenses" /> : licenses.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-2">License</th><th>Seats</th><th>Used</th><th>Available</th><th>Expiry</th></tr></thead><tbody>{licenses.data.map((license) => <tr key={license.id} className="border-b"><td className="py-3">••••••••{String(license.id).slice(-4)}</td><td>{license.seats_total}</td><td>{license.seats_used ?? 0}</td><td>{license.seats_available ?? 0}</td><td>{license.expiry_date ?? "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No licenses" description="Add a license to track its keys and seat usage." />}</CardContent></Card>
    : tab === "Assigned users" ? <Card><CardHeader><h2 className="text-sm font-semibold">Assigned users</h2></CardHeader><CardContent>{usage.isLoading ? <Spinner label="Loading assignments" /> : usage.data?.length ? <div className="space-y-2">{usage.data.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{row.employee?.first_name} {row.employee?.last_name}</p><p className="text-xs text-muted-foreground">{row.employee?.employee_code} · {row.revoked_at ? "Revoked" : "Active"}</p></div>{!row.revoked_at && <Button variant="outline" size="sm" loading={revoke.isPending} onClick={() => revoke.mutate(row)}>Revoke</Button>}</div>)}</div> : <EmptyState title="No assigned users" description="Assigned access will appear here." />}</CardContent></Card>
    : <Card><CardHeader><h2 className="text-sm font-semibold">Activity</h2></CardHeader><CardContent>{activity.isLoading ? <Spinner label="Loading activity" /> : activity.data?.length ? <div className="space-y-3">{activity.data.map((row, index) => <p key={String(row.id ?? index)} className="text-sm">{String(row.description ?? row.action ?? "Updated")} <span className="text-xs text-muted-foreground">{String(row.createdAt ?? "")}</span></p>)}</div> : <EmptyState title="No activity yet" description="Changes will be recorded here." />}</CardContent></Card>}
    <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}><DialogContent><DialogTitle>Add software license</DialogTitle><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); addLicense.mutate(); }}><label className="block space-y-1 text-xs font-medium">License key<Input type="password" autoComplete="new-password" value={licenseForm.license_key} onChange={(event) => setLicenseForm({ ...licenseForm, license_key: event.target.value })} /></label><label className="block space-y-1 text-xs font-medium">Total seats<Input required min="1" type="number" value={licenseForm.seats_total} onChange={(event) => setLicenseForm({ ...licenseForm, seats_total: event.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-xs font-medium">Purchase date<Input type="date" value={licenseForm.purchase_date} onChange={(event) => setLicenseForm({ ...licenseForm, purchase_date: event.target.value })} /></label><label className="space-y-1 text-xs font-medium">Expiry date<Input type="date" value={licenseForm.expiry_date} onChange={(event) => setLicenseForm({ ...licenseForm, expiry_date: event.target.value })} /></label></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setLicenseOpen(false)}>Cancel</Button><Button loading={addLicense.isPending}>Save license</Button></div></form></DialogContent></Dialog>
  </>;
}
