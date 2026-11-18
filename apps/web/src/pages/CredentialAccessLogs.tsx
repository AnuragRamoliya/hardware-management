import { useMemo, useState } from "react";
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialAccessLogsList,
  useVerifyAuditIntegrity,
} from "@/hooks/queries/credentials";
import type { TableColumn } from "@/components/common/CommonTable";
import { accessLogFilters } from "@/components/credentials/CredentialFilters";
import type { CredentialAccessLogDto } from "@/api/credentials";
import { toast } from "sonner";
import { endPoints } from "@/api/endpoint";

export function CredentialAccessLogs() {
  const { tableState, setTableState } = useTableState(10);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    total: number;
    error?: string | null;
  } | null>(null);

  const { data, isLoading, error, refetch } =
    useCredentialAccessLogsList(tableState);
  const verifyMutation = useVerifyAuditIntegrity();

  const handleVerifyIntegrity = async () => {
    try {
      const res = await verifyMutation.mutateAsync();
      if (res.ok && res.data) {
        setVerifyResult({
          valid: res.data.accessLogsValid ?? res.data.valid ?? false,
          total:
            res.data.totalAccessLogsVerified ?? res.data.total_records ?? 0,
          error: res.data.accessLogsError ?? res.data.details ?? null,
        });
        setVerifyDialogOpen(true);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Verification failed");
    }
  };

  const handleExportCsv = () => {
    const apiUrl = import.meta.env.VITE_HOST_API ?? "";
    const exportUrl = `${apiUrl}/${endPoints.credential.audit.export}`;
    window.open(exportUrl, "_blank");
  };

  const columns = useMemo<TableColumn<CredentialAccessLogDto>[]>(
    () => [
      {
        id: "accessed_at",
        label: "Timestamp",
        sortable: true,
        render: (row) => (
          <span className="text-xs font-mono text-muted-foreground">
            {new Date(row.accessed_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "accessor",
        label: "Accessor (Admin / User)",
        sortable: true,
        render: (row) =>
          row.accessor ? (
            <div>
              <span className="font-medium text-foreground">
                {row.accessor.first_name} {row.accessor.last_name}
              </span>
              <div className="text-xs text-muted-foreground">
                {row.accessor.email}
              </div>
            </div>
          ) : (
            <span className="text-sm">User #{row.accessed_by}</span>
          ),
      },
      {
        id: "credential",
        label: "Accessed Account",
        sortable: true,
        render: (row) =>
          row.credential ? (
            <div>
              <span className="font-medium text-foreground">
                {row.credential.label}
              </span>
              <div className="text-xs text-muted-foreground font-mono">
                {row.credential.username}
              </div>
            </div>
          ) : (
            <span className="text-sm">Credential #{row.credential_id}</span>
          ),
      },
      {
        id: "employee",
        label: "Account Owner",
        sortable: true,
        render: (row) =>
          row.employee ? (
            <span className="text-sm">
              {row.employee.first_name} {row.employee.last_name} (
              {row.employee.employee_code})
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "action",
        label: "Action",
        sortable: true,
        render: (row) => (
          <Badge
            variant="outline"
            className="uppercase text-[10px] tracking-wider font-semibold"
          >
            {row.action}
          </Badge>
        ),
      },
      {
        id: "reason",
        label: "Access Justification",
        sortable: false,
        render: (row) => (
          <span
            className="text-xs text-foreground/90 max-w-xs line-clamp-2"
            title={row.reason || ""}
          >
            {row.reason || "—"}
          </span>
        ),
      },
      {
        id: "hash",
        label: "Cryptographic Hash",
        sortable: false,
        render: (row) => (
          <div
            className="text-[11px] font-mono text-muted-foreground"
            title={row.hash}
          >
            {row.hash.slice(0, 10)}...{row.hash.slice(-6)}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPageScaffold
        title="Vault Access Audit Trail"
        description="Every credential reveal, view, and export is authenticated, rate-limited, and recorded with SHA-256 hash chaining."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials", href: "/credentials" },
          { label: "Access Audit" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleVerifyIntegrity}
              disabled={verifyMutation.isPending}
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              {verifyMutation.isPending
                ? "Verifying Chain..."
                : "Verify Audit Integrity"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportCsv}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
        columns={columns}
        rows={
          (data?.rows as CredentialAccessLogDto[]) ??
          (data as unknown as { items?: CredentialAccessLogDto[] })?.items ??
          []
        }
        count={
          data?.count ?? (data as unknown as { total?: number })?.total ?? 0
        }
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={accessLogFilters}
        emptyTitle="No access records found"
      />

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {verifyResult?.valid ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertOctagon className="h-6 w-6 text-destructive" />
              )}
              <DialogTitle>
                {verifyResult?.valid
                  ? "Audit Integrity Verified"
                  : "Audit Chain Integrity Warning"}
              </DialogTitle>
            </div>
            <DialogDescription>
              Cryptographic verification of forward-secure SHA-256 hash
              chaining.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {verifyResult?.valid ? (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-3 text-xs text-green-800 dark:text-green-300 space-y-2">
                <p className="font-semibold text-sm">Hash Chain Intact</p>
                <p>
                  All {verifyResult.total} sequential access log records were
                  mathematically validated against their preceding SHA-256
                  hashes.
                </p>
                <p className="text-[11px] text-green-700 dark:text-green-400">
                  Zero records were modified, omitted, or reordered after
                  insertion.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-300 space-y-2">
                <p className="font-semibold text-sm">
                  Chain Discontinuity Detected
                </p>
                <p>
                  {verifyResult?.error ||
                    "Hash mismatch found in audit records."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setVerifyDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default CredentialAccessLogs;
