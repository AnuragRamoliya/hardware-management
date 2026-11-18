import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import {
  useCredentialTypesList,
  useDeleteCredentialType,
} from "@/hooks/queries/credentials";
import { getCredentialTypeColumns } from "@/components/credentials/CredentialTypeColumns";
import { AddEditCredentialType } from "@/components/credentials/AddEditCredentialType";
import { credentialTypeFilters } from "@/components/credentials/CredentialTypeFilters";
import type { CredentialTypeDto } from "@/api/credentials";

export function CredentialTypes() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, close } =
    useFormDrawer<CredentialTypeDto>();
  const [deletingType, setDeletingType] = useState<CredentialTypeDto | null>(
    null,
  );

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.credential,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } =
    useCredentialTypesList(tableState);
  const deleteMutation = useDeleteCredentialType();

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;
    await deleteMutation.mutateAsync(deletingType.id);
    setDeletingType(null);
  };

  const columns = useMemo(
    () =>
      getCredentialTypeColumns({
        onEdit: openEdit,
        onDelete: (type) => setDeletingType(type),
        canWrite,
        canDelete,
      }),
    [openEdit, canWrite, canDelete],
  );

  const rows =
    (data?.rows as CredentialTypeDto[]) ??
    (data as unknown as { items?: CredentialTypeDto[] })?.items ??
    [];
  const count =
    data?.count ?? (data as unknown as { total?: number })?.total ?? 0;

  return (
    <>
      <ListPageScaffold
        title="Credential Types"
        description="Configure credential categories, complexity policies, rotation intervals, and approval rules."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials", href: "/credentials" },
          { label: "Credential Types" },
        ]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add type
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={rows}
        count={count}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={credentialTypeFilters}
        emptyTitle="No credential types configured"
      />

      <AddEditCredentialType
        open={isOpen}
        onOpenChange={(open) => !open && close()}
        credentialType={editingItem}
      />

      <ConfirmDialog
        open={Boolean(deletingType)}
        onOpenChange={(open) => !open && setDeletingType(null)}
        title="Delete Credential Type"
        description={`Are you sure you want to delete "${deletingType?.name}"? Credentials using this type may be affected.`}
        confirmText="Delete Type"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export default CredentialTypes;
