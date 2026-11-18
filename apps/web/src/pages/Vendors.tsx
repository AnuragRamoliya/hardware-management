import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useVendorsList,
  useVendor,
  useDeleteVendor,
  type VendorRecord,
} from "@/hooks/queries/vendors";
import { getVendorColumns } from "@/components/vendors/VendorColumns";
import { vendorFilters } from "@/components/vendors/VendorFilters";
import { AddEditVendor } from "@/components/vendors/AddEditVendor";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Vendors() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<VendorRecord>();
  const [deletingItem, setDeletingItem] = useState<VendorRecord | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.vendor,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useVendorsList(tableState);
  const deleteMutation = useDeleteVendor();

  const activeVendorId = editingItem?.id;
  const { data: fullVendor, isLoading: isFetchingDetail } = useVendor(
    activeVendorId ?? "",
    Boolean(activeVendorId),
  );

  const columns = useMemo(
    () =>
      getVendorColumns({
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
        title="Vendors"
        description="Manage external suppliers and support partners."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Vendors" }]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add vendor
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as VendorRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={vendorFilters}
        emptyTitle="No vendors found"
      />

      <AddEditVendor
        open={isOpen}
        onOpenChange={setIsOpen}
        vendor={fullVendor || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete vendor"
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
