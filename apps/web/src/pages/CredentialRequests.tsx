import { useMemo, useState, useCallback } from "react";
import { Plus, XCircle } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialRequestsList,
  useCancelCredentialRequest,
} from "@/hooks/queries/credentials";
import type { TableColumn } from "@/components/common/CommonTable";
import { CreateCollectionRequestDialog } from "@/components/credentials/CreateCollectionRequestDialog";
import type { CredentialCollectionRequestDto } from "@/api/credentials";
import { COLLECTION_REQUEST_STATUS } from "@hm/shared";

export function CredentialRequests() {
  const { tableState, setTableState } = useTableState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } =
    useCredentialRequestsList(tableState);
  const cancelMutation = useCancelCredentialRequest();

  const handleCancel = useCallback(
    async (id: number) => {
      await cancelMutation.mutateAsync(id);
    },
    [cancelMutation],
  );

  const columns = useMemo<TableColumn<CredentialCollectionRequestDto>[]>(
    () => [
      {
        id: "employee",
        label: "Target Employee",
        sortable: true,
        render: (row) =>
          row.employee ? (
            <div>
              <span className="font-medium text-foreground">
                {row.employee.first_name} {row.employee.last_name}
              </span>
              <div className="text-xs text-muted-foreground">
                {row.employee.employee_code}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "credential_type",
        label: "Requested Account Type",
        sortable: true,
        render: (row) => (
          <div>
            <span className="font-medium text-foreground">
              {row.credential_type?.name}
            </span>
            {row.message && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {row.message}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "requested_by",
        label: "Requested By",
        sortable: false,
        render: (row) =>
          row.requester ? (
            <span className="text-sm">
              {row.requester.first_name} {row.requester.last_name}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "due_date",
        label: "Due Date",
        sortable: true,
        render: (row) => {
          const isOverdue =
            row.request_status === COLLECTION_REQUEST_STATUS.PENDING &&
            new Date(row.due_date).getTime() < Date.now();
          return (
            <span
              className={`text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
            >
              {new Date(row.due_date).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </span>
          );
        },
      },
      {
        id: "request_status",
        label: "Status",
        sortable: true,
        render: (row) => {
          switch (row.request_status) {
            case COLLECTION_REQUEST_STATUS.FULFILLED:
              return <Badge variant="success">Fulfilled</Badge>;
            case COLLECTION_REQUEST_STATUS.OVERDUE:
              return <Badge variant="destructive">Overdue</Badge>;
            case COLLECTION_REQUEST_STATUS.CANCELLED:
              return <Badge variant="muted">Cancelled</Badge>;
            case COLLECTION_REQUEST_STATUS.PENDING:
            default:
              return <Badge variant="warning">Awaiting Employee</Badge>;
          }
        },
      },
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        render: (row) =>
          row.request_status === COLLECTION_REQUEST_STATUS.PENDING ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
              onClick={() => handleCancel(row.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          ) : null,
      },
    ],
    [cancelMutation.isPending, handleCancel],
  );

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
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Request credentials
          </Button>
        }
        columns={columns}
        rows={(data?.rows as CredentialCollectionRequestDto[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        emptyTitle="No collection requests"
      />

      <CreateCollectionRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
export default CredentialRequests;
