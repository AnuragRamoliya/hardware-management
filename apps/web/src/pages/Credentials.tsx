import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialsList,
  useDeleteCredential,
} from "@/hooks/queries/credentials";
import { getCredentialColumns } from "@/components/credentials/CredentialColumns";
import { credentialFilters } from "@/components/credentials/CredentialFilters";
import { AddEditCredentialDialog } from "@/components/credentials/AddEditCredentialDialog";
import { RevealSecretDialog } from "@/components/credentials/RevealSecretDialog";
import { RotatePasswordDialog } from "@/components/credentials/RotatePasswordDialog";
import { CredentialHistoryDialog } from "@/components/credentials/CredentialHistoryDialog";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import type { CredentialDto } from "@/api/credentials";

export function Credentials() {
  const { tableState, setTableState } = useTableState(10);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CredentialDto | null>(null);
  const [revealingItem, setRevealingItem] = useState<CredentialDto | null>(
    null,
  );
  const [rotatingItem, setRotatingItem] = useState<CredentialDto | null>(null);
  const [historyItem, setHistoryItem] = useState<CredentialDto | null>(null);
  const [deletingItem, setDeletingItem] = useState<CredentialDto | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.credential,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;
  const canReveal =
    role === "admin" ||
    (permissions as unknown as Record<string, boolean>)?.reveal_access === true;

  const { data, isLoading, error, refetch } = useCredentialsList(tableState);
  const deleteMutation = useDeleteCredential();

  const columns = useMemo(
    () =>
      getCredentialColumns({
        onReveal: (cred) => setRevealingItem(cred),
        onEdit: (cred) => {
          setEditingItem(cred);
          setAddEditOpen(true);
        },
        onChangePassword: (cred) => setRotatingItem(cred),
        onHistory: (cred) => setHistoryItem(cred),
        onDelete: (cred) => setDeletingItem(cred),
        canWrite,
        canDelete,
        canReveal,
      }),
    [canWrite, canDelete, canReveal],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  return (
    <>
      <ListPageScaffold
        title="Credential Vault"
        description="Securely store, manage, and audit corporate credentials and employee-submitted accounts."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials" },
        ]}
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setEditingItem(null);
                setAddEditOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add credential
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as CredentialDto[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={credentialFilters}
        emptyTitle="No credentials in vault"
      />

      <AddEditCredentialDialog
        open={addEditOpen}
        onOpenChange={(open) => {
          setAddEditOpen(open);
          if (!open) setEditingItem(null);
        }}
        credential={editingItem}
      />

      <RevealSecretDialog
        open={Boolean(revealingItem)}
        onOpenChange={(open) => !open && setRevealingItem(null)}
        credential={revealingItem}
      />

      <RotatePasswordDialog
        open={Boolean(rotatingItem)}
        onOpenChange={(open) => !open && setRotatingItem(null)}
        credential={rotatingItem}
      />

      <CredentialHistoryDialog
        open={Boolean(historyItem)}
        onOpenChange={(open) => !open && setHistoryItem(null)}
        credential={historyItem}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Revoke Credential"
        description={`Are you sure you want to revoke and delete "${deletingItem?.label}"? This action cannot be undone.`}
        confirmText="Revoke & Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
export default Credentials;
