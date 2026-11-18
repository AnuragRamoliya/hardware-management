import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import { useTableState } from "@/hooks/use-tableState";
import { maintenanceFilters } from "@/pages/MaintenanceFilters";

type MaintenanceRecord = { id: number; asset_id: number; issue: string; vendor_id?: number | null; cost?: number | string | null; sent_at: string; returned_at?: string | null; resolution?: string | null; maintenance_status: number };
const columns: TableColumn<MaintenanceRecord>[] = [
  { id: "asset", label: "Asset", render: (row) => <Link className="text-primary hover:underline" to={`/assets/${row.asset_id}`}>Asset #{row.asset_id}</Link> },
  { id: "issue", label: "Issue", render: (row) => row.issue },
  { id: "status", label: "Status", render: (row) => <Badge variant={row.maintenance_status === 1 ? "warning" : "success"}>{row.maintenance_status === 1 ? "In maintenance" : "Completed"}</Badge> },
  { id: "sent_at", label: "Sent", render: (row) => new Date(row.sent_at).toLocaleDateString() },
  { id: "returned_at", label: "Returned", render: (row) => row.returned_at ? new Date(row.returned_at).toLocaleDateString() : "—" },
  { id: "cost", label: "Cost", render: (row) => row.cost ?? "—" },
];

export function Maintenance() {
  const { tableState, setTableState } = useTableState();
  const query = useQuery({
    queryKey: ["asset-maintenance", tableState],
    queryFn: async () => {
      const response = await callApi<{ rows: MaintenanceRecord[]; count: number }, typeof tableState>({ url: endPoints.asset.maintenance.list, method: "POST", body: tableState });
      if (!response.ok) throw new Error(response.message || "Unable to load maintenance records");
      return response.data ?? { rows: [], count: 0 };
    },
  });
  return <><PageHeader title="Asset maintenance" description="Track repairs and service history across your inventory." /><CommonTable columns={columns} rows={query.data?.rows ?? []} count={query.data?.count ?? 0} query={tableState} onQueryChange={setTableState} loading={query.isLoading} error={query.error?.message} onRetry={() => void query.refetch()} filterFields={maintenanceFilters} emptyTitle="No maintenance records" /></>;
}
