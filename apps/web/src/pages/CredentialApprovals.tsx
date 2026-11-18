import { useState, useMemo, useCallback } from "react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import {
  useCredentialApprovalsList,
  useApproveCredential,
  useBulkApproveCredentials,
} from "@/hooks/queries/credentials";
import { approvalQueueFilters } from "@/components/credentials/CredentialFilters";
import { getCredentialApprovalColumns } from "@/components/credentials/CredentialApprovalColumns";
import {
  RejectCredentialDialog,
  NeedsChangeDialog,
} from "@/components/credentials/ApprovalActionDialogs";
import type { CredentialDto } from "@/api/credentials";

export function CredentialApprovals() {
  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.credential,
  );
  const canApprove = role === "admin" || permissions?.write_access === true;

  const { tableState, setTableState } = useTableState(10);
  const [rejectingItem, setRejectingItem] = useState<CredentialDto | null>(
    null,
  );
  const [needsChangeItem, setNeedsChangeItem] = useState<CredentialDto | null>(
    null,
  );
  const [bulkApproveIds, setBulkApproveIds] = useState<number[] | null>(null);

  const { data, isLoading, error, refetch } =
    useCredentialApprovalsList(tableState);
  const approveMutation = useApproveCredential();
  const bulkApproveMutation = useBulkApproveCredentials();

  const handleApprove = useCallback(
    async (credential: CredentialDto) => {
      await approveMutation.mutateAsync(credential.id);
    },
    [approveMutation],
  );

  const handleBulkApprove = useCallback(async (ids: (string | number)[]) => {
    const numericIds = ids.map(Number).filter((id) => !isNaN(id));
    if (numericIds.length === 0) return;
    setBulkApproveIds(numericIds);
  }, []);

  const confirmBulkApprove = async () => {
    if (!bulkApproveIds || bulkApproveIds.length === 0) return;
    await bulkApproveMutation.mutateAsync(bulkApproveIds);
    setBulkApproveIds(null);
  };

  const columns = useMemo(
    () =>
      getCredentialApprovalColumns({
        onApprove: (row) => handleApprove(row),
        onNeedsChange: (row) => setNeedsChangeItem(row),
        onReject: (row) => setRejectingItem(row),
        canApprove,
      }),
    [handleApprove, canApprove],
  );

  const rows =
    (data?.rows as CredentialDto[]) ??
    (data as unknown as { items?: CredentialDto[] })?.items ??
    [];
  const count =
    data?.count ?? (data as unknown as { total?: number })?.total ?? 0;

  return (
    <>
      <ListPageScaffold
        title="Credential Approval Queue"
        description="Review and authorize employee-submitted accounts before they can be officially recognized."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials", href: "/credentials" },
          { label: "Approvals" },
        ]}
        columns={columns}
        rows={rows}
        count={count}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={approvalQueueFilters}
        onBulkAction={canApprove ? handleBulkApprove : undefined}
        emptyTitle="Approval queue is empty"
      />

      <RejectCredentialDialog
        open={Boolean(rejectingItem)}
        onOpenChange={(open) => !open && setRejectingItem(null)}
        credential={rejectingItem}
      />

      <NeedsChangeDialog
        open={Boolean(needsChangeItem)}
        onOpenChange={(open) => !open && setNeedsChangeItem(null)}
        credential={needsChangeItem}
      />

      <ConfirmDialog
        open={Boolean(bulkApproveIds && bulkApproveIds.length > 0)}
        onOpenChange={(open) => !open && setBulkApproveIds(null)}
        title="Bulk Approve Credentials"
        description={`Are you sure you want to approve all ${bulkApproveIds?.length ?? 0} selected credentials?`}
        confirmText="Approve All"
        onConfirm={confirmBulkApprove}
      />
    </>
  );
}

export default CredentialApprovals;
