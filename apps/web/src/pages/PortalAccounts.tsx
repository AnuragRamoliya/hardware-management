import { useMemo, useState } from "react";
import { Plus, AlertCircle, Send } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  usePortalConsentStatus,
  usePortalCredentialsList,
  usePortalRequests,
  usePortalDeleteCredential,
} from "@/hooks/queries/credentials";
import { ConsentModal } from "@/components/credentials/ConsentModal";
import { RevealSecretDialog } from "@/components/credentials/RevealSecretDialog";
import { RotatePasswordDialog } from "@/components/credentials/RotatePasswordDialog";
import { AddEditPortalAccount } from "@/components/credentials/AddEditPortalAccount";
import { getPortalAccountColumns } from "@/components/credentials/PortalAccountColumns";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS } from "@hm/shared";

export function PortalAccounts() {
  const { tableState, setTableState } = useTableState(10);
  const [consentDismissed, setConsentDismissed] = useState(false);

  const [revealingItem, setRevealingItem] = useState<CredentialDto | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<CredentialDto | null>(null);
  const [editingItem, setEditingItem] = useState<CredentialDto | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [defaultTypeId, setDefaultTypeId] = useState<number | undefined>();
  const [rotatingItem, setRotatingItem] = useState<CredentialDto | null>(null);

  const { data: consent, refetch: refetchConsent } = usePortalConsentStatus();
  const { data: requests = [] } = usePortalRequests();
  const { data, isLoading, error, refetch } =
    usePortalCredentialsList(tableState);
  const deleteMutation = usePortalDeleteCredential();

  const showConsentModal =
    consent && !consent.consent_accepted && !consentDismissed;

  const handleOpenAdd = (typeId?: number) => {
    setEditingItem(null);
    setDefaultTypeId(typeId);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: CredentialDto) => {
    setEditingItem(item);
    setDefaultTypeId(undefined);
    setIsAddOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  const columns = useMemo(
    () =>
      getPortalAccountColumns({
        onReveal: (row) => setRevealingItem(row),
        onChangePassword: (row) => setRotatingItem(row),
        onEdit: (row) => handleOpenEdit(row),
        onDelete: (row) => setDeletingItem(row),
      }),
    [],
  );

  const rows =
    (data?.rows as CredentialDto[]) ??
    (data as unknown as { items?: CredentialDto[] })?.items ??
    [];
  const count =
    data?.count ?? (data as unknown as { total?: number })?.total ?? 0;

  return (
    <>
      <ConsentModal
        open={Boolean(showConsentModal)}
        policyText={consent?.policy_text ?? undefined}
        onAccepted={() => {
          setConsentDismissed(true);
          void refetchConsent();
        }}
      />

      <div className="space-y-4">
        {/* Open Requests Banner */}
        {requests.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  Action Required: Company Credential Request
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The IT department has requested {requests.length}{" "}
                  credential(s) from you. Due date:{" "}
                  {new Date(requests[0]!.due_date).toLocaleDateString()}.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenAdd(requests[0]!.credential_type_id)}
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" /> Submit Requested Account
            </Button>
          </div>
        )}

        {/* Needs Change / Rejection Callout */}
        {data?.rows?.some(
          (i: CredentialDto) =>
            i.approval_status === CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE &&
            i.review_feedback,
        ) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Action Required: Modifications Requested
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                One or more of your accounts requires review feedback
                corrections before approval.
              </p>
            </div>
          </div>
        )}

        <ListPageScaffold
          title="My Accounts & Credentials"
          description="View your company-provided credentials and submit personal or project accounts for IT authorization."
          breadcrumbs={[
            { label: "Portal", href: "/portal" },
            { label: "Accounts" },
          ]}
          action={
            <Button onClick={() => handleOpenAdd()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add account
            </Button>
          }
          columns={columns}
          rows={rows}
          count={count}
          query={tableState}
          onQueryChange={setTableState}
          loading={isLoading}
          error={error instanceof Error ? error.message : undefined}
          onRetry={refetch}
          emptyTitle="No accounts registered in your vault"
        />
      </div>

      <AddEditPortalAccount
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingItem(null);
            setDefaultTypeId(undefined);
          }
        }}
        credential={editingItem}
        defaultTypeId={defaultTypeId}
      />

      <RevealSecretDialog
        open={Boolean(revealingItem)}
        onOpenChange={(open) => !open && setRevealingItem(null)}
        credential={revealingItem}
        isPortal
      />

      <RotatePasswordDialog
        open={Boolean(rotatingItem)}
        onOpenChange={(open) => !open && setRotatingItem(null)}
        credential={rotatingItem}
        isPortal
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete Account Submission"
        description={`Are you sure you want to delete "${deletingItem?.label}"? This will permanently remove your submission from the vault.`}
        confirmText="Delete Account"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export default PortalAccounts;
