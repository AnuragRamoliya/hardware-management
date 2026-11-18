import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { CommonTable } from "@/components/common/CommonTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useTableState } from "@/hooks/use-tableState";
import { maintenanceFilters } from "@/pages/MaintenanceFilters";
import {
  useMaintenanceList,
  type MaintenanceRecord,
} from "@/hooks/queries/maintenance";
import { getMaintenanceColumns } from "@/pages/MaintenanceColumns";
import { AddEditMaintenance } from "@/components/maintenance/AddEditMaintenance";
import { CompleteMaintenanceDialog } from "@/components/maintenance/CompleteMaintenanceDialog";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Maintenance() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState();

  // Modals state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completeRecord, setCompleteRecord] =
    useState<MaintenanceRecord | null>(null);

  // User & permissions
  const currentUser = useAuthStore((state) => state.user);
  const role = getUserRole(currentUser);
  const permissions = usePermissionStore(
    (state) => state.modulePermissions["asset"],
  );
  const canWrite =
    role === "admin" ||
    role === "hardware" ||
    permissions?.write_access === true;

  const query = useMaintenanceList(tableState);

  const handleComplete = useCallback((record: MaintenanceRecord) => {
    setCompleteRecord(record);
  }, []);

  const handleViewAsset = useCallback(
    (assetId: number) => {
      navigate(PATHS.ASSET_DETAIL.replace(":id", String(assetId)));
    },
    [navigate],
  );

  const columns = useMemo(
    () =>
      getMaintenanceColumns({
        onComplete: handleComplete,
        onViewAsset: handleViewAsset,
        canWrite,
      }),
    [handleComplete, handleViewAsset, canWrite],
  );

  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows]);

  return (
    <>
      <PageHeader
        title="Asset Maintenance"
        description="Track repair tickets, servicing vendors, and resolution logs across all hardware assets."
        action={
          canWrite ? (
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Log maintenance
            </Button>
          ) : undefined
        }
      />

      <CommonTable
        columns={columns}
        rows={rows}
        count={query.data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={query.isLoading}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        filterFields={maintenanceFilters}
        emptyTitle="No maintenance records found"
      />

      {/* Drawers & Dialogs */}
      <AddEditMaintenance open={drawerOpen} onOpenChange={setDrawerOpen} />

      <CompleteMaintenanceDialog
        open={Boolean(completeRecord)}
        onOpenChange={(open) => !open && setCompleteRecord(null)}
        record={completeRecord}
      />
    </>
  );
}
