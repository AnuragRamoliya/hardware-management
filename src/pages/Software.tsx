import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { softwareApi, type SoftwareRecord } from "@/api/software";
import { useTableState } from "@/hooks/use-tableState";
import { useAsyncOptions } from "@/hooks/use-async-options";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { SOFTWARE_CATEGORIES, SOFTWARE_LICENSE_TYPES } from "@/utils/constants";
import { softwareFilters } from "@/pages/SoftwareFilters";

function AsyncOptionSelect({ endpoint, label, value, onChange, filters = {} }: { endpoint: string; label: string; value: string; onChange: (value: string) => void; filters?: Record<string, string | number | boolean> }) {
  const options = useAsyncOptions({ endpoint, filters, enabled: true });
  return <div className="space-y-1.5"><label className="text-xs font-medium">{label}</label><select className="h-10 w-full rounded-md border bg-card px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.data?.rows.map((item) => <option key={item.value} value={String(item.value)}>{item.label} {item.subLabel ? " · " + item.subLabel : ""}</option>)}</select>{options.hasMore && <button type="button" className="text-xs text-primary" onClick={() => void options.loadMore()}>Load more</button>}</div>;
}
export function Software() {
  const { tableState, setTableState } = useTableState();
  const client = useQueryClient();
  const [editing, setEditing] = useState<SoftwareRecord | null>(null);
  const [assignTarget, setAssignTarget] = useState<SoftwareRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ["software", tableState],
    queryFn: async () => {
      const response = await softwareApi.list(tableState);
      if (!response.ok || !response.data) throw new Error(response.message || "Unable to load software");
      return response.data;
    },
  });
  const invalidate = () => client.invalidateQueries({ queryKey: ["software"] });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, vendor_id: form.vendor_id ? Number(form.vendor_id) : undefined, cost: form.cost ? Number(form.cost) : undefined };
      const response = editing ? await softwareApi.update({ ...body, id: editing.id }) : await softwareApi.add(body);
      if (!response.ok) throw new Error(response.message);
    },
    onSuccess: () => { toast.success(editing ? "Software updated" : "Software added"); setEditing(null); setForm({}); void invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const assign = useMutation({
    mutationFn: async () => {
      if (!assignTarget || !form.employee_id) throw new Error("Select an employee.");
      const response = await softwareApi.assign({ software_id: Number(assignTarget.id), employee_id: Number(form.employee_id), license_id: form.license_id ? Number(form.license_id) : undefined });
      if (!response.ok) throw new Error(response.message);
    },
    onSuccess: () => { toast.success("Software assigned"); setAssignTarget(null); setForm({}); void invalidate(); void client.invalidateQueries({ queryKey: ["software-usage"] }); },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (item: SoftwareRecord) => { const response = await softwareApi.remove(item.id); if (!response.ok) throw new Error(response.message); },
    onSuccess: () => { toast.success("Software deleted"); void invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const columns = useMemo<TableColumn<SoftwareRecord>[]>(() => [
    { id: "name", label: "Software", render: (row) => <Link className="font-medium text-primary hover:underline" to={"/software/" + row.id}>{row.name}</Link> },
    { id: "category", label: "Category", render: (row) => row.category },
    { id: "license_type", label: "License type", render: (row) => row.license_type.replaceAll("_", " ") },
    { id: "seats_used", label: "Seat usage", render: (row) => row.seats_total ? row.seats_used + " / " + row.seats_total : "—" },
    { id: "renewal_date", label: "Renewal", render: (row) => row.renewal_date ?? "—" },
    { id: "actions", label: "Actions", sortable: false, render: (row) => <RowActionsMenu label={`Actions for ${row.name}`} actions={[
      { label: "Edit", onSelect: () => { setEditing(row); setForm({ name: row.name, category: row.category, license_type: row.license_type, vendor_id: String(row.vendor_id ?? ""), cost: String(row.cost ?? ""), billing_cycle: row.billing_cycle ?? "", renewal_date: row.renewal_date ?? "", notes: row.notes ?? "" }); } },
      { label: "Assign", onSelect: () => { setAssignTarget(row); setForm({}); } },
      { label: "Delete", destructive: true, onSelect: () => remove.mutate(row) },
    ]} /> },
  ], [remove]);
  return <>
    <PageHeader title="Software" description="Manage applications, licenses, renewals, and employee access." action={<Button onClick={() => { setEditing(null); setForm({ category: "productivity", license_type: "per_user" }); }}><Plus className="h-4 w-4" />Add software</Button>} />
    <CommonTable columns={columns} rows={query.data?.rows ?? []} count={query.data?.count ?? 0} query={tableState} onQueryChange={setTableState} loading={query.isLoading} error={query.error?.message} onRetry={() => void query.refetch()} filterFields={softwareFilters} emptyTitle="No software found" />
    <Dialog open={Boolean(editing) || (!editing && Object.keys(form).length > 0 && !assignTarget)} onOpenChange={(open) => { if (!open) { setEditing(null); setForm({}); } }}>
      <DialogContent><DialogTitle>{editing ? "Edit software" : "Add software"}</DialogTitle><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <label className="space-y-1 text-xs font-medium sm:col-span-2">Name<Input required value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Category<select className="h-10 w-full rounded-md border bg-card px-3" value={form.category ?? "productivity"} onChange={(event) => setForm({ ...form, category: event.target.value })}>{SOFTWARE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="space-y-1 text-xs font-medium">License type<select className="h-10 w-full rounded-md border bg-card px-3" value={form.license_type ?? "per_user"} onChange={(event) => setForm({ ...form, license_type: event.target.value })}>{SOFTWARE_LICENSE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <AsyncOptionSelect endpoint="vendor/options" label="Vendor" value={form.vendor_id ?? ""} onChange={(value) => setForm({ ...form, vendor_id: value })} />
        <label className="space-y-1 text-xs font-medium">Cost<Input type="number" value={form.cost ?? ""} onChange={(event) => setForm({ ...form, cost: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Billing cycle<Input value={form.billing_cycle ?? ""} onChange={(event) => setForm({ ...form, billing_cycle: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium">Renewal date<Input type="date" value={form.renewal_date ?? ""} onChange={(event) => setForm({ ...form, renewal_date: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-medium sm:col-span-2">Notes<textarea className="min-h-20 w-full rounded-md border bg-card p-3 text-sm" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm({}); }}>Cancel</Button><Button loading={save.isPending}>{editing ? "Save changes" : "Create software"}</Button></div>
      </form></DialogContent>
    </Dialog>
    <Dialog open={Boolean(assignTarget)} onOpenChange={(open) => { if (!open) setAssignTarget(null); }}><DialogContent><DialogTitle>Assign {assignTarget?.name}</DialogTitle><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); assign.mutate(); }}>
      <AsyncOptionSelect endpoint="employee/options" label="Employee" value={form.employee_id ?? ""} onChange={(value) => setForm({ ...form, employee_id: value })} />
      {assignTarget && <AsyncOptionSelect endpoint="software/license/options" filters={{ software_id: Number(assignTarget.id), has_available_seats: true }} label="License (optional)" value={form.license_id ?? ""} onChange={(value) => setForm({ ...form, license_id: value })} />}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAssignTarget(null)}>Cancel</Button><Button loading={assign.isPending}>Assign software</Button></div>
    </form></DialogContent></Dialog>
  </>;
}
