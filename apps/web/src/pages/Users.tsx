import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useUsersList,
  useUser,
  useDeleteUser,
  type UserRecord,
} from "@/hooks/queries/users";
import { getUserColumns } from "@/components/users/UserColumns";
import { userFilters } from "@/components/users/UserFilters";
import { AddEditUser } from "@/components/users/AddEditUser";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function Users() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<UserRecord>();
  const [deletingItem, setDeletingItem] = useState<UserRecord | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.user,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useUsersList(tableState);
  const deleteMutation = useDeleteUser();

  const activeUserId = editingItem?.id;
  const { data: fullUser, isLoading: isFetchingDetail } = useUser(
    activeUserId ?? "",
    Boolean(activeUserId),
  );

  const columns = useMemo(
    () =>
      getUserColumns({
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
        title="Users"
        description="Manage accounts and assign access to your ITAM workspace."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Users" }]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as UserRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={userFilters}
        emptyTitle="No users found"
      />

      <AddEditUser
        open={isOpen}
        onOpenChange={setIsOpen}
        user={fullUser || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete user"
        description={`Are you sure you want to delete "${deletingItem?.first_name} ${deletingItem?.last_name || ""}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
