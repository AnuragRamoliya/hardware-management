import { Eye, RefreshCw, Pencil, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS, PROVIDED_BY } from "@hm/shared";

export interface PortalAccountColumnActions {
  onReveal: (credential: CredentialDto) => void;
  onChangePassword: (credential: CredentialDto) => void;
  onEdit: (credential: CredentialDto) => void;
  onDelete: (credential: CredentialDto) => void;
}

export function getPortalAccountColumns(
  actions: PortalAccountColumnActions,
): TableColumn<CredentialDto>[] {
  const { onReveal, onChangePassword, onEdit, onDelete } = actions;

  return [
    {
      id: "label",
      label: "Account / Service",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.label}</span>
          {row.credential_type && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>{row.credential_type.name}</span>
              {row.url && (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  (URL)
                </a>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "username",
      label: "Username / Email",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm text-foreground">
          {row.username}
        </span>
      ),
    },
    {
      id: "origin",
      label: "Origin",
      sortable: true,
      render: (row) =>
        row.provided_by === PROVIDED_BY.COMPANY ? (
          <Badge variant="outline">Company Provided</Badge>
        ) : (
          <Badge variant="default">Submitted by You</Badge>
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
            return <Badge variant="outline">Needs Changes</Badge>;
          default:
            return null;
        }
      },
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const rowActions: RowAction[] = [
          {
            key: "reveal",
            label: "Reveal secret",
            icon: Eye,
            onSelect: () => onReveal(row),
          },
          {
            key: "change_password",
            label: "Change password",
            icon: RefreshCw,
            onSelect: () => onChangePassword(row),
          },
          {
            key: "edit",
            label: "Edit details",
            icon: Pencil,
            onSelect: () => onEdit(row),
          },
        ];

        if (row.provided_by === PROVIDED_BY.EMPLOYEE) {
          rowActions.push({
            key: "delete",
            label: "Delete account",
            icon: Trash2,
            destructive: true,
            separatorBefore: true,
            onSelect: () => onDelete(row),
          });
        }

        return <RowActionsMenu label="Account actions" actions={rowActions} />;
      },
    },
  ];
}
