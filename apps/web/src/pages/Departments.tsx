import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useDepartmentsList,
  useDepartment,
  useDeleteDepartment,
  type DepartmentRecord,
} from "@/hooks/queries/departments";
import { getDepartmentColumns } from "@/components/departments/DepartmentColumns";
import { departmentFilters } from "@/components/departments/DepartmentFilters";
import { AddEditDepartment } from "@/components/departments/AddEditDepartment";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Departments() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<DepartmentRecord>();
  const [deletingItem, setDeletingItem] = useState<DepartmentRecord | null>(
    null,
  );

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.department,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useDepartmentsList(tableState);
  const deleteMutation = useDeleteDepartment();

  const activeDepartmentId = editingItem?.id;
  const { data: fullDepartment, isLoading: isFetchingDetail } = useDepartment(
    activeDepartmentId ?? "",
    Boolean(activeDepartmentId),
  );

  const columns = useMemo(
    () =>
      getDepartmentColumns({
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
        title="Departments"
        description="Organize employees into teams and departments."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Departments" },
        ]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add department
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as DepartmentRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={departmentFilters}
        emptyTitle="No departments found"
      />

      <AddEditDepartment
        open={isOpen}
        onOpenChange={setIsOpen}
        department={fullDepartment || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete department"
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
