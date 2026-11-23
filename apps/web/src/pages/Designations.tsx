import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useDesignationsList,
  useDesignation,
  useDeleteDesignation,
  type DesignationRecord,
} from "@/hooks/queries/designations";
import { getDesignationColumns } from "@/components/designations/DesignationColumns";
import { designationFilters } from "@/components/designations/DesignationFilters";
import { AddEditDesignation } from "@/components/designations/AddEditDesignation";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Designations() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<DesignationRecord>();
  const [deletingItem, setDeletingItem] = useState<DesignationRecord | null>(
    null,
  );

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.designation,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useDesignationsList(tableState);
  const deleteMutation = useDeleteDesignation();

  const activeDesignationId = editingItem?.id;
  const { data: fullDesignation, isLoading: isFetchingDetail } = useDesignation(
    activeDesignationId ?? "",
    Boolean(activeDesignationId),
  );

  const columns = useMemo(
    () =>
      getDesignationColumns({
        onEdit: openEdit,
        onDelete: setDeletingItem,
        canWrite,
        canDelete,
      }),
    [openEdit, canWrite, canDelete],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  return (
    <>
      <ListPageScaffold
        title="Designations"
        description="Maintain the job titles used across your organization."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Designations" },
        ]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add designation
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as DesignationRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={designationFilters}
        emptyTitle="No designations found"
      />

      <AddEditDesignation
        open={isOpen}
        onOpenChange={setIsOpen}
        designation={fullDesignation || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete designation"
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
