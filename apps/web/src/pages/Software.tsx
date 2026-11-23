import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable } from "@/components/common/CommonTable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { softwareFilters } from "@/pages/SoftwareFilters";
import {
  useSoftwareList,
  useDeleteSoftware,
  useSoftware,
} from "@/hooks/queries/software";
import { getSoftwareColumns } from "@/pages/SoftwareColumns";
import { AddEditSoftware } from "@/components/software/AddEditSoftware";
import { AssignSoftwareDialog } from "@/components/software/AssignSoftwareDialog";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import type { SoftwareRecord } from "@/api/software";

export function Software() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState();

  // Modals state
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SoftwareRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoftwareRecord | null>(null);

  // User & permissions
  const currentUser = useAuthStore((state) => state.user);
  const role = getUserRole(currentUser);
  const permissions = usePermissionStore(
    (state) => state.modulePermissions["software"],
  );
  const canWrite =
    role === "admin" ||
    role === "hardware" ||
    permissions?.write_access === true;
  const canDelete =
    role === "admin" ||
    role === "hardware" ||
    permissions?.delete_access === true;

  const query = useSoftwareList(tableState);
  const editingQuery = useSoftware(editingId ?? "", Boolean(editingId));
  const deleteMutation = useDeleteSoftware();

  const handleView = useCallback(
    (item: SoftwareRecord) => {
      navigate(PATHS.SOFTWARE_DETAIL.replace(":id", String(item.id)));
    },
    [navigate],
  );

  const handleEdit = useCallback((item: SoftwareRecord) => {
    setEditingId(item.id);
    setDrawerOpen(true);
  }, []);

  const handleAssign = useCallback((item: SoftwareRecord) => {
    setAssignTarget(item);
  }, []);

  const handleDelete = useCallback((item: SoftwareRecord) => {
    setDeleteTarget(item);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Software application deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete software",
      );
    }
  };

  const columns = useMemo(
    () =>
      getSoftwareColumns({
        onView: handleView,
        onEdit: handleEdit,
        onAssign: handleAssign,
        onDelete: handleDelete,
        canWrite,
        canDelete,
      }),
    [handleView, handleEdit, handleAssign, handleDelete, canWrite, canDelete],
  );

  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows]);

  return (
    <>
      <PageHeader
        title="Software & Subscriptions"
        description="Manage software catalog, seat allocations, license keys, and upcoming renewals."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setEditingId(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add software
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
        filterFields={softwareFilters}
        emptyTitle="No software applications found"
      />

      {/* Drawers & Dialogs */}
      <AddEditSoftware
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditingId(null);
        }}
        software={editingId ? editingQuery.data : null}
        loading={Boolean(editingId) && editingQuery.isLoading}
      />

      <AssignSoftwareDialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        software={assignTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="Are you sure you want to delete this software application? Active license allocations and keys should be revoked first."
        confirmText="Delete software"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  );
}
