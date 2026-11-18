import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, CheckSquare, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable } from "@/components/common/CommonTable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { PATHS } from "@/routes/paths";
import {
  useAssetsList,
  useUnassignedAssetsList,
  useDeleteAsset,
  useAsset,
} from "@/hooks/queries/assets";
import { getAssetsColumns } from "./AssetsColumns";
import { assetFilters } from "./AssetsFilters";
import { AddEditAsset } from "@/components/assets/AddEditAsset";
import { AssignAssetDialog } from "@/components/assets/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/assets/ReturnAssetDialog";
import { TransferAssetDialog } from "@/components/assets/TransferAssetDialog";
import { AssetQrModal } from "@/components/assets/AssetQrModal";
import { BulkAssignAssetDialog } from "@/components/assets/BulkAssignAssetDialog";
import { BulkReturnAssetDialog } from "@/components/assets/BulkReturnAssetDialog";
import { AssetImportDialog } from "@/components/assets/AssetImportDialog";
import { AddEditMaintenance } from "@/components/maintenance/AddEditMaintenance";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import type { AssetRecord } from "@/api/assets";

export function Assets() {
  return <AssetsList unassignedOnly={false} />;
}

export function UnassignedAssets() {
  return <AssetsList unassignedOnly />;
}

function AssetsList({ unassignedOnly }: { unassignedOnly: boolean }) {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState();
  const currentUser = useAuthStore((state) => state.user);
  const role = getUserRole(currentUser);
  const permissions = usePermissionStore((state) => state.modulePermissions["asset"]);
  const canWrite = role === "admin" || role === "hardware" || permissions?.write_access === true;
  const canDelete = role === "admin" || role === "hardware" || permissions?.delete_access === true;

  // Selected item states for dialogs
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkReturnOpen, setBulkReturnOpen] = useState(false);

  // Queries
  const listQuery = useAssetsList(tableState);
  const unassignedQuery = useUnassignedAssetsList(tableState);
  const query = unassignedOnly ? unassignedQuery : listQuery;

  // Fetch full asset record for editing
  const editingAssetQuery = useAsset(editingId ?? "", Boolean(editingId));
  const deleteMutation = useDeleteAsset();

  const handleEdit = useCallback((asset: AssetRecord) => {
    setEditingId(asset.id);
    setDrawerOpen(true);
  }, []);

  const handleAssign = useCallback((asset: AssetRecord) => {
    setSelectedAsset(asset);
    setAssignOpen(true);
  }, []);

  const handleReturn = useCallback((asset: AssetRecord) => {
    setSelectedAsset(asset);
    setReturnOpen(true);
  }, []);

  const handleTransfer = useCallback((asset: AssetRecord) => {
    setSelectedAsset(asset);
    setTransferOpen(true);
  }, []);

  const handleMaintenance = useCallback((asset: AssetRecord) => {
    setSelectedAsset(asset);
    setMaintenanceOpen(true);
  }, []);

  const handleQr = useCallback((asset: AssetRecord) => {
    setSelectedAsset(asset);
    setQrOpen(true);
  }, []);

  const handleDelete = useCallback((asset: AssetRecord) => {
    setDeleteTarget(asset);
  }, []);

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(
    () =>
      getAssetsColumns({
        onView: (asset) => navigate(PATHS.ASSET_DETAIL.replace(":id", String(asset.id))),
        onEdit: handleEdit,
        onAssign: handleAssign,
        onReturn: handleReturn,
        onTransfer: handleTransfer,
        onMaintenance: handleMaintenance,
        onQr: handleQr,
        onDelete: handleDelete,
        canWrite,
        canDelete,
      }),
    [handleEdit, handleAssign, handleReturn, handleTransfer, handleMaintenance, handleQr, handleDelete, canWrite, canDelete, navigate],
  );

  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows]);
  const selectedAssets = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds],
  );

  return (
    <>
      <PageHeader
        title={unassignedOnly ? "Unassigned Assets" : "Hardware Assets"}
        description={
          unassignedOnly
            ? "Equipment ready for assignment, setup, or reallocation."
            : "Manage hardware inventory, assignments, warranties, and serial records."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canWrite && !unassignedOnly && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                Import
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add asset
              </Button>
            )}
          </div>
        }
      />

      {/* Bulk Action Bar Helper when items are selected */}
      {selectedIds.length > 0 && canWrite && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{selectedIds.length}</span>
            <span className="text-muted-foreground">assets selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkAssignOpen(true)}
            >
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
              Assign selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkReturnOpen(true)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Return selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <CommonTable
        columns={columns}
        rows={rows}
        count={query.data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={query.isLoading}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        filterFields={assetFilters}
        onBulkAction={(ids) => {
          setSelectedIds(ids);
          if (unassignedOnly) {
            setBulkAssignOpen(true);
          } else {
            const selectedRows = rows.filter((r) => ids.includes(r.id));
            const hasAssigned = selectedRows.some((r) => r.asset_status === 2);
            if (hasAssigned) {
              setBulkReturnOpen(true);
            } else {
              setBulkAssignOpen(true);
            }
          }
        }}
        emptyTitle={unassignedOnly ? "No unassigned assets" : "No hardware assets found"}
      />

      {/* Drawers & Dialogs */}
      <AddEditAsset
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditingId(null);
        }}
        asset={editingId ? editingAssetQuery.data : null}
        loading={Boolean(editingId) && editingAssetQuery.isLoading}
      />

      <AssignAssetDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        asset={selectedAsset}
      />

      <ReturnAssetDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        asset={selectedAsset}
      />

      <TransferAssetDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        asset={selectedAsset}
      />

      <AddEditMaintenance
        open={maintenanceOpen}
        onOpenChange={setMaintenanceOpen}
        initialAssetId={selectedAsset?.id ? Number(selectedAsset.id) : undefined}
      />

      <AssetQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        asset={selectedAsset}
      />

      <BulkAssignAssetDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        assets={selectedAssets}
        onComplete={() => setSelectedIds([])}
      />

      <BulkReturnAssetDialog
        open={bulkReturnOpen}
        onOpenChange={setBulkReturnOpen}
        assets={selectedAssets}
        onComplete={() => setSelectedIds([])}
      />

      <AssetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete asset ${deleteTarget?.asset_tag}?`}
        description="Are you sure you want to delete this hardware asset? This action will soft-delete the asset and retain historical assignment logs."
        confirmText="Delete asset"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  );
}
