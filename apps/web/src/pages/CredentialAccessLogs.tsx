import { useState, useMemo } from "react";
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialAccessLogsList,
  useVerifyAuditIntegrity,
} from "@/hooks/queries/credentials";
import { accessLogFilters } from "@/components/credentials/CredentialFilters";
import { getCredentialAccessLogColumns } from "@/components/credentials/CredentialAccessLogColumns";
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

  const columns = useMemo(() => getCredentialAccessLogColumns(), []);

  const rows =
    (data?.rows as CredentialAccessLogDto[]) ??
    (data as unknown as { items?: CredentialAccessLogDto[] })?.items ??
    [];
  const count =
    data?.count ?? (data as unknown as { total?: number })?.total ?? 0;

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
        rows={rows}
        count={count}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={accessLogFilters}
        emptyTitle="No access records found"
      />

      <ActionDialogLayout
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        title={
          verifyResult?.valid
            ? "Audit Integrity Verified"
            : "Audit Chain Integrity Warning"
        }
        description="Cryptographic verification of forward-secure SHA-256 hash chaining."
      >
        <div className="py-2 space-y-4">
          <div className="flex items-center gap-3">
            {verifyResult?.valid ? (
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
            ) : (
              <AlertOctagon className="h-8 w-8 text-destructive shrink-0" />
            )}
            <div>
              <p className="font-semibold text-foreground text-sm">
                {verifyResult?.valid
                  ? "Forward-Secure Hash Chain Intact"
                  : "Cryptographic Chain Discontinuity"}
              </p>
              <p className="text-xs text-muted-foreground">
                {verifyResult?.valid
                  ? `All ${verifyResult.total} sequential records mathematically match preceding hashes.`
                  : verifyResult?.error ||
                    "Hash mismatch found in audit records."}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            {verifyResult?.valid ? (
              <p>
                Zero records have been inserted, modified, or omitted since
                audit logging commenced. Each event is forward-secured with
                HMAC-SHA256 linkage.
              </p>
            ) : (
              <p className="text-destructive font-medium">
                Warning: Possible tampering or database direct alteration
                detected. Please report this immediately to your security lead.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => setVerifyDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </ActionDialogLayout>
    </>
  );
}

export default CredentialAccessLogs;
