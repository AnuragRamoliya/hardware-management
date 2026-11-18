import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import {
  useCredentialRequestsList,
  useCancelCredentialRequest,
} from "@/hooks/queries/credentials";
import { getCredentialRequestColumns } from "@/components/credentials/CredentialRequestColumns";
import { CreateCollectionRequestDialog } from "@/components/credentials/CreateCollectionRequestDialog";
import { collectionRequestFilters } from "@/components/credentials/CredentialFilters";
import type { CredentialCollectionRequestDto } from "@/api/credentials";

export function CredentialRequests() {
  const { tableState, setTableState } = useTableState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancellingRequest, setCancellingRequest] =
    useState<CredentialCollectionRequestDto | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.credential,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;

  const { data, isLoading, error, refetch } =
    useCredentialRequestsList(tableState);
  const cancelMutation = useCancelCredentialRequest();

  const handleCancelConfirm = async () => {
    if (!cancellingRequest) return;
    await cancelMutation.mutateAsync(cancellingRequest.id);
    setCancellingRequest(null);
  };

  const columns = useMemo(
    () =>
      getCredentialRequestColumns({
        onCancel: (request) => setCancellingRequest(request),
        canCancel: canWrite,
      }),
    [canWrite],
  );

  const rows =
    (data?.rows as CredentialCollectionRequestDto[]) ??
    (data as unknown as { items?: CredentialCollectionRequestDto[] })?.items ??
    [];
  const count =
    data?.count ?? (data as unknown as { total?: number })?.total ?? 0;

  return (
    <>
      <ListPageScaffold
        title="Credential Collection Requests"
        description="Request credentials from employees. Submissions automatically fulfill and resolve open requests."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials", href: "/credentials" },
          { label: "Collection Requests" },
        ]}
        action={
          canWrite ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Request credentials
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
        filterFields={collectionRequestFilters}
        emptyTitle="No collection requests"
      />

      <CreateCollectionRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <ConfirmDialog
        open={Boolean(cancellingRequest)}
        onOpenChange={(open) => !open && setCancellingRequest(null)}
        title="Cancel Collection Request"
        description={`Are you sure you want to cancel the credential request for ${
          cancellingRequest?.employee
            ? `${cancellingRequest.employee.first_name} ${cancellingRequest.employee.last_name}`
            : "this employee"
        }?`}
        confirmText="Cancel Request"
        variant="destructive"
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}

export default CredentialRequests;
