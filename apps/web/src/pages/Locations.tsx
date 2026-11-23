import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useLocationsList,
  useLocation,
  useDeleteLocation,
  type LocationRecord,
} from "@/hooks/queries/locations";
import { getLocationColumns } from "@/components/locations/LocationColumns";
import { locationFilters } from "@/components/locations/LocationFilters";
import { AddEditLocation } from "@/components/locations/AddEditLocation";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Locations() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<LocationRecord>();
  const [deletingItem, setDeletingItem] = useState<LocationRecord | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.location,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useLocationsList(tableState);
  const deleteMutation = useDeleteLocation();

  const activeLocationId = editingItem?.id;
  const { data: fullLocation, isLoading: isFetchingDetail } = useLocation(
    activeLocationId ?? "",
    Boolean(activeLocationId),
  );

  const columns = useMemo(
    () =>
      getLocationColumns({
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
        title="Locations"
        description="Keep office locations and sites up to date."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Locations" },
        ]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add location
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as LocationRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={locationFilters}
        emptyTitle="No locations found"
      />

      <AddEditLocation
        open={isOpen}
        onOpenChange={setIsOpen}
        location={fullLocation || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete location"
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
