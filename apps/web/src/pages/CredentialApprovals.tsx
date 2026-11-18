import { useMemo, useState, useCallback } from "react";
import { Check, X, Edit3, CheckCheck } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialApprovalsList,
  useApproveCredential,
  useBulkApproveCredentials,
} from "@/hooks/queries/credentials";
import type { TableColumn } from "@/components/common/CommonTable";
import { approvalQueueFilters } from "@/components/credentials/CredentialFilters";
import {
  RejectCredentialDialog,
  NeedsChangeDialog,
} from "@/components/credentials/ApprovalActionDialogs";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS } from "@hm/shared";

export function CredentialApprovals() {
  const { tableState, setTableState } = useTableState(10);
  const [rejectingItem, setRejectingItem] = useState<CredentialDto | null>(
    null,
  );
  const [needsChangeItem, setNeedsChangeItem] = useState<CredentialDto | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data, isLoading, error, refetch } =
    useCredentialApprovalsList(tableState);
  const approveMutation = useApproveCredential();
  const bulkApproveMutation = useBulkApproveCredentials();

  const handleApprove = useCallback(
    async (id: number) => {
      await approveMutation.mutateAsync(id);
    },
    [approveMutation],
  );

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    await bulkApproveMutation.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const columns = useMemo<TableColumn<CredentialDto>[]>(
    () => [
      {
        id: "select",
        label: "",
        sortable: false,
        render: (row) => (
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds((prev) => [...prev, row.id]);
              } else {
                setSelectedIds((prev) => prev.filter((id) => id !== row.id));
              }
            }}
          />
        ),
      },
      {
        id: "label",
        label: "Account / Service",
        sortable: true,
        render: (row) => (
          <div>
            <span className="font-medium text-foreground">{row.label}</span>
            <div className="text-xs text-muted-foreground">
              {row.credential_type?.name}
            </div>
          </div>
        ),
      },
      {
        id: "username",
        label: "Username / Identity",
        sortable: true,
        render: (row) => (
          <span className="font-mono text-sm">{row.username}</span>
        ),
      },
      {
        id: "employee",
        label: "Submitted By",
        sortable: true,
        render: (row) =>
          row.employee ? (
            <span className="text-sm font-medium">
              {row.employee.first_name} {row.employee.last_name} (
              {row.employee.employee_code})
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "approval_status",
        label: "Current Status",
        sortable: true,
        render: (row) =>
          row.approval_status === CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE ? (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300"
            >
              Needs Changes
            </Badge>
          ) : (
            <Badge variant="warning">Pending Review</Badge>
          ),
      },
      {
        id: "submitted_at",
        label: "Submitted Date",
        sortable: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.submitted_at
              ? new Date(row.submitted_at).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Review Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30"
              onClick={() => handleApprove(row.id)}
              disabled={approveMutation.isPending}
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={() => setNeedsChangeItem(row)}
            >
              <Edit3 className="h-3.5 w-3.5" /> Needs Change
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-destructive border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setRejectingItem(row)}
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        ),
      },
    ],
    [selectedIds, approveMutation.isPending, handleApprove],
  );

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
        action={
          selectedIds.length > 0 ? (
            <Button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCheck className="h-4 w-4" />
              Approve Selected ({selectedIds.length})
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
        filterFields={approvalQueueFilters}
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
    </>
  );
}
export default CredentialApprovals;
