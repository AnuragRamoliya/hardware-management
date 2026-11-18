import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import {
  useCredentialTypesList,
  useAddCredentialType,
  useUpdateCredentialType,
  useDeleteCredentialType,
} from "@/hooks/queries/credentials";
import type { TableColumn } from "@/components/common/CommonTable";
import type { CredentialCategory } from "@hm/shared";
import type { CredentialTypeDto } from "@/api/credentials";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";

export function CredentialTypes() {
  const { tableState, setTableState } = useTableState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CredentialTypeDto | null>(
    null,
  );
  const [deletingType, setDeletingType] = useState<CredentialTypeDto | null>(
    null,
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [expiryDays, setExpiryDays] = useState<number | "">("");
  const [minLength, setMinLength] = useState(12);
  const [requireComplexity, setRequireComplexity] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [allowEmployeeSubmit, setAllowEmployeeSubmit] = useState(true);
  const [notes, setNotes] = useState("");

  const { data, isLoading, error, refetch } =
    useCredentialTypesList(tableState);
  const addMutation = useAddCredentialType();
  const updateMutation = useUpdateCredentialType();
  const deleteMutation = useDeleteCredentialType();

  const handleOpenCreate = () => {
    setEditingType(null);
    setName("");
    setCategory("other");
    setExpiryDays("");
    setMinLength(12);
    setRequireComplexity(true);
    setRequiresApproval(true);
    setAllowEmployeeSubmit(true);
    setNotes("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (type: CredentialTypeDto) => {
    setEditingType(type);
    setName(type.name);
    setCategory(type.category);
    setExpiryDays(type.expiry_days ?? "");
    setMinLength(type.min_length ?? 12);
    setRequireComplexity(Boolean(type.require_complexity));
    setRequiresApproval(Boolean(type.requires_approval));
    setAllowEmployeeSubmit(Boolean(type.allow_employee_submit));
    setNotes(type.notes || "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      category: category.trim() as CredentialCategory,
      expiry_days: expiryDays === "" ? null : Number(expiryDays),
      min_length: minLength,
      require_complexity: requireComplexity,
      requires_approval: requiresApproval,
      allow_employee_submit: allowEmployeeSubmit,
      notes: notes ? notes.trim() : null,
    };

    if (editingType) {
      await updateMutation.mutateAsync({ id: editingType.id, ...payload });
    } else {
      await addMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;
    await deleteMutation.mutateAsync(deletingType.id);
    setDeletingType(null);
  };

  const columns = useMemo<TableColumn<CredentialTypeDto>[]>(
    () => [
      {
        id: "name",
        label: "Type Name",
        sortable: true,
        render: (row) => (
          <div>
            <span className="font-medium text-foreground">{row.name}</span>
            {row.notes && (
              <p className="text-xs text-muted-foreground">{row.notes}</p>
            )}
          </div>
        ),
      },
      {
        id: "category",
        label: "Category",
        sortable: true,
        render: (row) => (
          <Badge variant="outline" className="capitalize">
            {row.category}
          </Badge>
        ),
      },
      {
        id: "policy",
        label: "Password Policy",
        sortable: false,
        render: (row) => (
          <div className="text-xs space-y-0.5">
            <div>Min length: {row.min_length} chars</div>
            <div className="text-muted-foreground">
              Complexity: {row.require_complexity ? "Enforced" : "Standard"}
            </div>
          </div>
        ),
      },
      {
        id: "expiry_days",
        label: "Expiry Policy",
        sortable: true,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.expiry_days ? `${row.expiry_days} days` : "No expiry"}
          </span>
        ),
      },
      {
        id: "flags",
        label: "Rules",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-2 text-xs">
            {row.requires_approval ? (
              <Badge variant="warning" className="text-[10px]">
                Requires Approval
              </Badge>
            ) : (
              <Badge variant="muted" className="text-[10px]">
                Auto-Approved
              </Badge>
            )}
            {row.allow_employee_submit && (
              <Badge
                variant="outline"
                className="text-[10px] text-purple-600 border-purple-300"
              >
                Employee Submit
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <RowActionsMenu
            label="Type actions"
            actions={[
              {
                key: "edit",
                label: "Edit",
                icon: Pencil,
                onSelect: () => handleOpenEdit(row),
              },
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                onSelect: () => setDeletingType(row),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPageScaffold
        title="Credential Types"
        description="Configure credential categories, complexity policies, rotation intervals, and approval rules."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Credentials", href: "/credentials" },
          { label: "Credential Types" },
        ]}
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add type
          </Button>
        }
        columns={columns}
        rows={
          (data?.rows as CredentialTypeDto[]) ??
          (data as unknown as { items?: CredentialTypeDto[] })?.items ??
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
        emptyTitle="No credential types configured"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Credential Type" : "Add Credential Type"}
            </DialogTitle>
            <DialogDescription>
              Define policy and validation parameters for this credential type.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">
                Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AWS Production, VPN, Jira..."
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type-cat">Category</Label>
                <NativeSelect
                  id="type-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="cloud">Cloud / Infrastructure</option>
                  <option value="network">Network / VPN</option>
                  <option value="email">Email / Workspace</option>
                  <option value="vcs">Git / VCS</option>
                  <option value="device">Device / Workstation</option>
                  <option value="database">Database</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type-expiry">Expiry (Days)</Label>
                <Input
                  id="type-expiry"
                  type="number"
                  min="1"
                  value={expiryDays}
                  onChange={(e) =>
                    setExpiryDays(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="e.g. 90 (or leave empty)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type-min-len">Min Length</Label>
                <Input
                  id="type-min-len"
                  type="number"
                  min="8"
                  max="64"
                  value={minLength}
                  onChange={(e) => setMinLength(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex items-center justify-between p-2.5 border rounded-lg mt-auto">
                <Label
                  htmlFor="type-complexity"
                  className="text-xs cursor-pointer"
                >
                  Require Complexity
                </Label>
                <Switch
                  id="type-complexity"
                  checked={requireComplexity}
                  onCheckedChange={setRequireComplexity}
                />
              </div>
            </div>

            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="type-approval"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Requires Admin Approval
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Employee submissions must be reviewed
                  </p>
                </div>
                <Switch
                  id="type-approval"
                  checked={requiresApproval}
                  onCheckedChange={setRequiresApproval}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label
                    htmlFor="type-allow-emp"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Allow Employee Submit
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Available in portal accounts form
                  </p>
                </div>
                <Switch
                  id="type-allow-emp"
                  checked={allowEmployeeSubmit}
                  onCheckedChange={setAllowEmployeeSubmit}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type-notes">Notes / Guidelines</Label>
              <Textarea
                id="type-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Guidelines shown to employee..."
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {editingType ? "Update Type" : "Save Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingType)}
        onOpenChange={(open) => !open && setDeletingType(null)}
        title="Delete Credential Type"
        description={`Are you sure you want to delete "${deletingType?.name}"?`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
export default CredentialTypes;
