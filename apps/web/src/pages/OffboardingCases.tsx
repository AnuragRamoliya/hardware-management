import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  useOffboardingCases,
  useCancelOffboardingCase,
} from "@/hooks/queries/offboarding";
import { getOffboardingColumns } from "@/components/offboarding/OffboardingColumns";
import { offboardingFilters } from "@/components/offboarding/OffboardingFilters";
import { InitiateOffboardingDialog } from "@/components/offboarding/InitiateOffboardingDialog";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import { PATHS } from "@/routes/paths";
import type { OffboardingCaseDto } from "@/api/offboarding";
import { toast } from "sonner";

export function OffboardingCases() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState(10);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [cancellingCase, setCancellingCase] =
    useState<OffboardingCaseDto | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.offboarding_case,
  );
  const canWrite =
    role === "admin" ||
    role === "hr" ||
    role === "hardware" ||
    permissions?.write_access === true;

  const { data, isLoading, error, refetch } = useOffboardingCases(tableState);
  const cancelMutation = useCancelOffboardingCase();

  const handleDownloadClearance = async (c: OffboardingCaseDto) => {
    try {
      const token = useAuthStore.getState().token;
      const baseUrl =
        (import.meta as unknown as { env: Record<string, string> }).env
          ?.VITE_API_BASE_URL || "/api";
      const url = `${baseUrl.replace(/\/$/, "")}/offboarding/cases/${c.id}/clearance-pdf`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to download clearance certificate");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Clearance-Certificate-EMP-${c.employee_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Clearance certificate downloaded");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error downloading certificate",
      );
    }
  };

  const columns = useMemo(
    () =>
      getOffboardingColumns({
        onView: (c) =>
          navigate(PATHS.OFFBOARDING_CASE_DETAIL.replace(":id", String(c.id))),
        onCancel: setCancellingCase,
        onDownloadClearance: handleDownloadClearance,
        canWrite,
      }),
    [navigate, canWrite],
  );

  const handleCancelConfirm = async () => {
    if (!cancellingCase) return;
    await cancelMutation.mutateAsync({
      id: cancellingCase.id,
      reason: "Cancelled by administrator",
    });
    setCancellingCase(null);
  };

  return (
    <>
      <ListPageScaffold
        title="Offboarding Cases"
        description="Track employee departures, monitor checklist clearances, and issue clearance certificates."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Offboarding Cases" },
        ]}
        action={
          <div className="flex gap-2">
            {(role === "admin" || role === "hardware") && (
              <Button
                variant="outline"
                onClick={() => navigate(PATHS.OFFBOARDING_SCAN_RETURNS)}
                className="gap-2"
              >
                <QrCode className="h-4 w-4" />
                Scan Returns
              </Button>
            )}
            {canWrite && (
              <Button onClick={() => setInitiateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Initiate Offboarding
              </Button>
            )}
          </div>
        }
        columns={columns}
        rows={(data?.list as OffboardingCaseDto[]) ?? []}
        count={data?.pagination?.totalItems ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={offboardingFilters}
        onRowClick={(row) =>
          navigate(PATHS.OFFBOARDING_CASE_DETAIL.replace(":id", String(row.id)))
        }
        emptyTitle="No offboarding cases found"
      />

      <InitiateOffboardingDialog
        open={initiateOpen}
        onOpenChange={setInitiateOpen}
      />

      <ConfirmDialog
        open={Boolean(cancellingCase)}
        onOpenChange={(open) => !open && setCancellingCase(null)}
        title="Cancel offboarding case"
        description={`Are you sure you want to cancel the offboarding process for ${cancellingCase?.employee?.first_name ?? "this employee"}? All pending tasks will be halted.`}
        confirmText="Cancel Case"
        variant="destructive"
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}
