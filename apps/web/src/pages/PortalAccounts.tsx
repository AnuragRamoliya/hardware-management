import { useMemo, useState } from "react";
import {
  Plus,
  AlertCircle,
  Send,
  Eye,
  RefreshCw,
  Trash2,
  Edit,
} from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  usePortalConsentStatus,
  usePortalCredentialsList,
  usePortalRequests,
  usePortalAllowedTypes,
  usePortalDeleteCredential,
  usePortalAddCredential,
  usePortalUpdateCredential,
  usePortalChangePassword,
} from "@/hooks/queries/credentials";
import type { TableColumn } from "@/components/common/CommonTable";
import { ConsentModal } from "@/components/credentials/ConsentModal";
import { RevealSecretDialog } from "@/components/credentials/RevealSecretDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS, PROVIDED_BY } from "@hm/shared";

export function PortalAccounts() {
  const { tableState, setTableState } = useTableState(10);
  const [consentDismissed, setConsentDismissed] = useState(false);

  const [revealingItem, setRevealingItem] = useState<CredentialDto | null>(
    null,
  );
  const [deletingItem, setDeletingItem] = useState<CredentialDto | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CredentialDto | null>(null);
  const [changePassItem, setChangePassItem] = useState<CredentialDto | null>(
    null,
  );

  // Form states for Add/Edit
  const [formTypeId, setFormTypeId] = useState<number | "">("");
  const [formLabel, setFormLabel] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Change password state
  const [newPassword, setNewPassword] = useState("");

  const { data: consent, refetch: refetchConsent } = usePortalConsentStatus();
  const { data: requests = [] } = usePortalRequests();
  const { data: allowedTypes = [] } = usePortalAllowedTypes();
  const { data, isLoading, error, refetch } =
    usePortalCredentialsList(tableState);

  const addMutation = usePortalAddCredential();
  const updateMutation = usePortalUpdateCredential();
  const changePassMutation = usePortalChangePassword();
  const deleteMutation = usePortalDeleteCredential();

  const showConsentModal =
    consent && !consent.consent_accepted && !consentDismissed;

  const handleOpenAdd = (typeId?: number) => {
    setEditingItem(null);
    setFormTypeId(typeId || (allowedTypes[0]?.id ?? ""));
    setFormLabel("");
    setFormUsername("");
    setFormPassword("");
    setFormUrl("");
    setFormNotes("");
    setAddModalOpen(true);
  };

  const handleOpenEdit = (item: CredentialDto) => {
    setEditingItem(item);
    setFormTypeId(item.credential_type_id);
    setFormLabel(item.label);
    setFormUsername(item.username);
    setFormPassword("");
    setFormUrl(item.url || "");
    setFormNotes(item.notes || "");
    setAddModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTypeId || !formLabel.trim() || !formUsername.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingItem && !formPassword) {
      toast.error("Password is required for new accounts");
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          label: formLabel.trim(),
          username: formUsername.trim(),
          url: formUrl.trim() || null,
          notes: formNotes.trim() || null,
        });
      } else {
        await addMutation.mutateAsync({
          credential_type_id: Number(formTypeId),
          label: formLabel.trim(),
          username: formUsername.trim(),
          password: formPassword,
          url: formUrl.trim() || null,
          notes: formNotes.trim() || null,
        });
      }
      setAddModalOpen(false);
    } catch {
      // toast in mutation
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePassItem || !newPassword) return;

    try {
      await changePassMutation.mutateAsync({
        id: changePassItem.id,
        password: newPassword,
      });
      setChangePassItem(null);
      setNewPassword("");
    } catch {
      // toast in mutation
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  const columns = useMemo<TableColumn<CredentialDto>[]>(
    () => [
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
        label: "Username / Email",
        sortable: true,
        render: (row) => (
          <span className="font-mono text-sm">{row.username}</span>
        ),
      },
      {
        id: "origin",
        label: "Origin",
        sortable: true,
        render: (row) =>
          row.provided_by === PROVIDED_BY.COMPANY ? (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              Company Provided
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-purple-600 border-purple-300"
            >
              Submitted by You
            </Badge>
          ),
      },
      {
        id: "approval_status",
        label: "Status",
        sortable: true,
        render: (row) => {
          switch (row.approval_status) {
            case CREDENTIAL_APPROVAL_STATUS.APPROVED:
              return <Badge variant="success">Approved</Badge>;
            case CREDENTIAL_APPROVAL_STATUS.PENDING:
              return <Badge variant="warning">Under Review</Badge>;
            case CREDENTIAL_APPROVAL_STATUS.REJECTED:
              return <Badge variant="destructive">Rejected</Badge>;
            case CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE:
              return (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300"
                >
                  Needs Changes
                </Badge>
              );
            default:
              return null;
          }
        },
      },
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setRevealingItem(row)}
            >
              <Eye className="h-3.5 w-3.5" /> Reveal
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              onClick={() => setChangePassItem(row)}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Change Password
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              onClick={() => handleOpenEdit(row)}
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
            {row.provided_by === PROVIDED_BY.EMPLOYEE && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setDeletingItem(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

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
          rows={(data?.rows as CredentialDto[]) ?? []}
          count={data?.count ?? 0}
          query={tableState}
          onQueryChange={setTableState}
          loading={isLoading}
          error={error instanceof Error ? error.message : undefined}
          onRetry={refetch}
          emptyTitle="No accounts registered in your vault"
        />
      </div>

      {/* Add / Edit Account Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Account Details" : "Submit Account to Vault"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update account metadata."
                : "Register account. Encrypted with AES-256-GCM and submitted for IT review."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAccount} className="space-y-4 py-2">
            {!editingItem && (
              <div className="space-y-1.5">
                <Label htmlFor="portal-type">
                  Account Type <span className="text-destructive">*</span>
                </Label>
                <NativeSelect
                  id="portal-type"
                  value={formTypeId}
                  onChange={(e) => setFormTypeId(Number(e.target.value))}
                  required
                >
                  <option value="">Select account type...</option>
                  {allowedTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="portal-label">
                Account / Service Label{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="portal-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Work GitHub, Staging VPN, BitLocker Key"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portal-username">
                Username / Email / Identity{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="portal-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="e.g. user@domain.com"
                required
              />
            </div>

            {!editingItem && (
              <div className="space-y-1.5">
                <Label htmlFor="portal-password">
                  Password / Secret Key{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="portal-password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Enter account secret"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="portal-url">Login URL (Optional)</Label>
              <Input
                id="portal-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portal-notes">Notes (Optional)</Label>
              <Textarea
                id="portal-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any relevant context..."
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Update" : "Submit Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog
        open={Boolean(changePassItem)}
        onOpenChange={(o) => !o && setChangePassItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Enter the new password for {changePassItem?.label}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-new-pass">New Password</Label>
              <Input
                id="portal-new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangePassItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={changePassMutation.isPending}>
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reveal Secret Modal */}
      <RevealSecretDialog
        open={Boolean(revealingItem)}
        onOpenChange={(open) => !open && setRevealingItem(null)}
        credential={revealingItem}
        isPortal={true}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Remove Account"
        description={`Are you sure you want to remove "${deletingItem?.label}" from your vault?`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
export default PortalAccounts;
