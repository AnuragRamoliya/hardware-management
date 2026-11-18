import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { assetsApi, type AssetRecord } from "@/api/assets";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import { useTableState } from "@/hooks/use-tableState";
import { useAsyncOptions } from "@/hooks/use-async-options";
import { ASSET_CONDITIONS, ASSET_STATUS, getAssetStatusLabel } from "@/utils/constants";
import { assetFilters } from "@/pages/AssetsFilters";

function AssetStatus({ status }: { status: number }) {
  const item = ASSET_STATUS.find((option) => option.value === status);
  const variant = item?.tone === "success" ? "success" : item?.tone === "warning" ? "warning" : item?.tone === "muted" ? "muted" : item?.tone === "danger" ? "danger" : "info";
  return <Badge variant={variant}>{getAssetStatusLabel(status)}</Badge>;
}

function EndpointSelect({ endpoint, label, value, onChange }: { endpoint: string; label: string; value: string; onChange: (value: string) => void }) {
  const options = useAsyncOptions({ endpoint, enabled: true });
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <select className="h-10 w-full rounded-md border bg-card px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.data?.rows.map((option) => <option key={option.value} value={String(option.value)}>{option.label}</option>)}
      </select>
      {options.hasMore && <button type="button" className="text-xs text-primary" onClick={() => void options.loadMore()}>Load more</button>}
    </div>
  );
}

export function Assets() {
  return <AssetsList unassignedOnly={false} />;
}
export function UnassignedAssets() {
  return <AssetsList unassignedOnly />;
}

function AssetsList({ unassignedOnly }: { unassignedOnly: boolean }) {
  const { tableState, setTableState } = useTableState();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [editing, setEditing] = useState<AssetRecord | null>(null);
  const [action, setAction] = useState<"assign" | "return" | "transfer" | "maintenance" | "import" | "qr" | null>(null);
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [deleting, setDeleting] = useState<AssetRecord | null>(null);
  const [bulkAssetIds, setBulkAssetIds] = useState<number[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [importReport, setImportReport] = useState<{ imported: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const queryKey = [unassignedOnly ? "assets-unassigned" : "assets", tableState];
  const result = useQuery({
    queryKey,
    queryFn: async () => {
      const response = unassignedOnly ? await assetsApi.unassigned(tableState) : await assetsApi.list(tableState);
      if (!response.ok || !response.data) throw new Error(response.message || "Unable to load assets");
      return response.data;
    },
  });
  const invalidate = () => client.invalidateQueries({ queryKey: [unassignedOnly ? "assets-unassigned" : "assets"] });
  const saveAsset = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = editing
        ? await assetsApi.update({ ...payload, id: editing.id } as Partial<AssetRecord> & { id: string | number })
        : await assetsApi.add(payload as Partial<AssetRecord>);
      if (!response.ok) throw new Error(response.message);
    },
    onSuccess: () => { toast.success(editing ? "Asset updated" : "Asset created"); setEditing(null); setForm({}); void invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const runAction = useMutation({
    mutationFn: async () => {
      if (!action) return null;
      if (action === "import") {
        const file = (document.getElementById("asset-import-file") as HTMLInputElement | null)?.files?.[0];
        if (!file) throw new Error("Choose a CSV or XLSX file.");
        const data = new FormData(); data.append("file", file);
        const response = await callApi<{ imported: number; errors: Array<{ row: number; message: string }> }, FormData>({ url: endPoints.asset.import, method: "POST", body: data });
        if (!response.ok || !response.data) throw new Error(response.message || "Asset import failed.");
        return response.data;
      }
      if (!selected && !(action === "assign" && bulkAssetIds.length)) return null;
      const id = selected ? Number(selected.id) : 0;
      let response;
      if (action === "assign" && bulkAssetIds.length) response = await assetsApi.bulkAssign(bulkAssetIds.map((asset_id) => ({ asset_id, employee_id: Number(form.employee_id), due_return_date: form.due_return_date || undefined, note: form.note })));
      else if (action === "assign") response = await assetsApi.assign({ asset_id: id, employee_id: Number(form.employee_id), due_return_date: form.due_return_date || undefined, note: form.note });
      else if (action === "return") response = await assetsApi.returnAsset({ asset_id: id, return_condition: form.return_condition || undefined, to_status: form.to_status || "available", notes: form.note });
      else if (action === "transfer") response = await assetsApi.transfer({ asset_id: id, to_employee_id: Number(form.employee_id), note: form.note });
      else if (action === "maintenance") response = await assetsApi.maintenance(id, form.issue || "");
      if (response && !response.ok) throw new Error(response.message);
      toast.success(action === "assign" ? (bulkAssetIds.length ? `${bulkAssetIds.length} assets assigned` : "Asset assigned") : action === "return" ? "Asset returned" : action === "transfer" ? "Asset transferred" : "Maintenance started");
      return null;
    },
    onSuccess: (report) => {
      if (action === "import" && report) {
        setImportReport(report);
        if (report.errors.length) toast.warning(report.imported + " imported; " + report.errors.length + " rows need attention");
        else toast.success(report.imported + " assets imported");
        void invalidate();
        return;
      }
      setAction(null); setSelected(null); setBulkAssetIds([]); setForm({}); void invalidate(); void client.invalidateQueries({ queryKey: ["employee-assets"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const removeAsset = useMutation({
    mutationFn: async (asset: AssetRecord) => { const response = await assetsApi.remove(asset.id); if (!response.ok) throw new Error(response.message); },
    onSuccess: () => { toast.success("Asset deleted"); void invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const columns: TableColumn<AssetRecord>[] = [
    { id: "asset_tag", label: "Asset tag", render: (row) => <Link className="font-medium text-primary hover:underline" to={"/assets/" + row.id}>{row.asset_tag}</Link> },
    { id: "serial_no", label: "Serial number", render: (row) => row.serial_no || "—" },
    { id: "model", label: "Brand / model", render: (row) => [row.brand, row.model].filter(Boolean).join(" ") || "—" },
    { id: "asset_status", label: "Status", render: (row) => <AssetStatus status={row.asset_status} /> },
    { id: "condition", label: "Condition", render: (row) => row.condition },
    { id: "current_assignment", label: "Assigned to", render: (row) => row.current_assignment?.employee ? row.current_assignment.employee.first_name + " " + row.current_assignment.employee.last_name : "—", sortable: false },
    { id: "actions", label: "Actions", sortable: false, render: (row) => <RowActionsMenu label={`Actions for ${row.asset_tag}`} actions={[
      { label: "View", onSelect: () => navigate("/assets/" + row.id) },
      { label: "Edit", onSelect: () => { setEditing(row); setForm({ serial_no: row.serial_no ?? "", brand: row.brand ?? "", model: row.model ?? "", condition: row.condition, purchase_date: row.purchase_date ?? "", warranty_end: row.warranty_end ?? "", purchase_cost: String(row.purchase_cost ?? ""), notes: row.notes ?? "" }); } },
      ...(row.asset_status === 1 ? [{ label: "Assign", onSelect: () => openAction(row, "assign") }] : [{ label: "Return", onSelect: () => openAction(row, "return") }]),
      ...(row.asset_status === 2 ? [{ label: "Transfer", onSelect: () => openAction(row, "transfer") }] : []),
      { label: "Maintenance", onSelect: () => openAction(row, "maintenance") },
      { label: "QR label", onSelect: () => openAction(row, "qr") },
      { label: "Delete", destructive: true, onSelect: () => setDeleting(row) },
    ]} /> },
  ];

  function openAction(asset: AssetRecord, type: NonNullable<typeof action>) {
    setSelected(asset); setAction(type); setForm({});
  }

  return (
    <>
      <PageHeader title={unassignedOnly ? "Unassigned assets" : "Assets"} description={unassignedOnly ? "Available equipment ready to assign." : "Track equipment, assignments, maintenance, and warranty status."} action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setAction("import"); setSelected(null); }}><Upload className="h-4 w-4" />Import</Button>
          <Button onClick={() => { setEditing(null); setForm({ condition: "good" }); }}><Plus className="h-4 w-4" />Add asset</Button>
        </div>
      } />
      <CommonTable
        columns={columns}
        rows={result.data?.rows ?? []}
        count={result.data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={result.isLoading}
        error={result.error?.message}
        onRetry={() => void result.refetch()}
        filterFields={unassignedOnly ? [] : assetFilters}
        emptyTitle={unassignedOnly ? "No unassigned assets" : "No assets found"}
        onBulkAction={unassignedOnly ? undefined : (ids) => { setSelected(null); setBulkAssetIds(ids.map(Number)); setAction("assign"); setForm({}); }}
      />
      <Dialog open={Boolean(editing) || (!editing && Object.keys(form).length > 0)} onOpenChange={(open) => { if (!open) { setEditing(null); setForm({}); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            const payload: Record<string, unknown> = { ...form, purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined, purchase_date: form.purchase_date || undefined, warranty_end: form.warranty_end || undefined };
            saveAsset.mutate(payload);
          }}>
            <EndpointSelect endpoint="asset_category/options" label="Category" value={form.category_id ?? ""} onChange={(value) => setForm({ ...form, category_id: value })} />
            <EndpointSelect endpoint="vendor/options" label="Vendor" value={form.vendor_id ?? ""} onChange={(value) => setForm({ ...form, vendor_id: value })} />
            <EndpointSelect endpoint="location/options" label="Location" value={form.location_id ?? ""} onChange={(value) => setForm({ ...form, location_id: value })} />
            {[
              ["serial_no", "Serial number"], ["brand", "Brand"], ["model", "Model"],
              ["purchase_date", "Purchase date"], ["purchase_cost", "Purchase cost"], ["warranty_end", "Warranty end"],
            ].map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium">{label}<Input type={key.endsWith("date") || key === "warranty_end" ? "date" : key === "purchase_cost" ? "number" : "text"} value={form[key] ?? ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
            <label className="space-y-1 text-xs font-medium">Condition<select className="h-10 w-full rounded-md border bg-card px-3 text-sm" value={form.condition ?? "good"} onChange={(event) => setForm({ ...form, condition: event.target.value })}>{ASSET_CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-xs font-medium sm:col-span-2">Notes<textarea className="min-h-20 w-full rounded-md border bg-card p-3 text-sm" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm({}); }}>Cancel</Button><Button loading={saveAsset.isPending}>{editing ? "Save changes" : "Create asset"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={action !== null} onOpenChange={(open) => { if (!open) { setAction(null); setImportReport(null); } }}>
        <DialogContent>
          <DialogTitle>{action === "assign" ? (bulkAssetIds.length ? `Assign ${bulkAssetIds.length} assets` : "Assign asset") : action === "return" ? "Return asset" : action === "transfer" ? "Transfer asset" : action === "maintenance" ? "Send for maintenance" : action === "import" ? "Import assets" : "Asset QR label"}</DialogTitle>
          {action === "qr" && selected ? <QrPreview id={Number(selected.id)} /> : action === "import" ? (
            <div className="mt-4 space-y-4">
              <button type="button" className="text-sm text-primary underline" onClick={() => {
                void fetch((import.meta.env.VITE_HOST_API ?? "") + endPoints.asset.importTemplate, { headers: { token: localStorage.getItem("token") ?? "", "plain-text": "true" } })
                  .then(async (response) => { if (!response.ok) throw new Error("Unable to download the template"); const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "assets-template.csv"; link.click(); URL.revokeObjectURL(link.href); })
                  .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to download the template"));
              }}>Download CSV template</button>
              <Input id="asset-import-file" type="file" accept=".csv,.xlsx" onChange={() => setImportReport(null)} />
              <p className="text-xs text-muted-foreground">Choose a CSV or XLSX file. The response includes row-level errors.</p>
              <Button loading={runAction.isPending} onClick={() => runAction.mutate()}>Import</Button>
              {importReport && <div className="space-y-2 rounded-md border p-3 text-sm"><p>Imported {importReport.imported} row(s). {importReport.errors.length} row error(s).</p>{importReport.errors.length > 0 && <div className="max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr className="border-b"><th className="py-1 pr-3">Row</th><th className="py-1">Issue</th></tr></thead><tbody>{importReport.errors.map((error, index) => <tr className="border-b last:border-0" key={error.row + "-" + index}><td className="py-1 pr-3">{error.row}</td><td className="py-1">{error.message}</td></tr>)}</tbody></table></div>}</div>}
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); runAction.mutate(); }}>
              {(action === "assign" || action === "transfer") && <EndpointSelect endpoint="employee/options" label="Employee" value={form.employee_id ?? ""} onChange={(value) => setForm({ ...form, employee_id: value })} />}
              {action === "assign" && <label className="block space-y-1 text-xs font-medium">Due return date<Input type="date" value={form.due_return_date ?? ""} onChange={(event) => setForm({ ...form, due_return_date: event.target.value })} /></label>}
              {action === "return" && <>
                <label className="block space-y-1 text-xs font-medium">Return condition<select className="h-10 w-full rounded-md border bg-card px-3" value={form.return_condition ?? "good"} onChange={(event) => setForm({ ...form, return_condition: event.target.value })}>{ASSET_CONDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="block space-y-1 text-xs font-medium">Destination<select className="h-10 w-full rounded-md border bg-card px-3" value={form.to_status ?? "available"} onChange={(event) => setForm({ ...form, to_status: event.target.value })}><option value="available">Available</option><option value="in_repair">In repair</option><option value="retired">Retired</option><option value="lost">Lost</option></select></label>
              </>}
              {action === "maintenance" && <label className="block space-y-1 text-xs font-medium">Issue<Input required value={form.issue ?? ""} onChange={(event) => setForm({ ...form, issue: event.target.value })} /></label>}
              {action !== "maintenance" && <label className="block space-y-1 text-xs font-medium">Note<textarea className="min-h-20 w-full rounded-md border bg-card p-3 text-sm" value={form.note ?? ""} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAction(null)}>Cancel</Button><Button loading={runAction.isPending}>{action === "assign" ? "Assign" : action === "return" ? "Return" : action === "transfer" ? "Transfer" : "Start maintenance"}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }} onConfirm={() => { if (deleting) removeAsset.mutate(deleting); setDeleting(null); }} title="Delete this asset?" description="This cannot be undone. Assets with an open assignment cannot be deleted." confirmText="Delete asset" variant="destructive" />
    </>
  );
}

function QrPreview({ id }: { id: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    void fetch((import.meta.env.VITE_HOST_API ?? "") + endPoints.asset.qr(id), {
      headers: { token: localStorage.getItem("token") ?? "", "plain-text": "true" },
    }).then((response) => response.text()).then((text) => {
      if (active) setSrc("data:image/svg+xml;charset=utf-8," + encodeURIComponent(text));
    }).catch(() => toast.error("Unable to load the QR label"));
    return () => { active = false; };
  }, [id]);
  return src ? <div className="mt-4 text-center"><img className="mx-auto h-56 w-56" src={src} alt="Asset QR code" /><p className="text-sm">{id}</p><Button type="button" variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" />Print label</Button></div> : <EmptyState title="Loading QR label" description="Preparing the asset label." />;
}
