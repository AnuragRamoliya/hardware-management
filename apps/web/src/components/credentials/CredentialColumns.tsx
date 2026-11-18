import { Link } from "react-router-dom";
import { Eye, History, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { PATHS } from "@/routes/paths";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS, PROVIDED_BY } from "@hm/shared";

export interface CredentialColumnActions {
  onReveal: (credential: CredentialDto) => void;
  onEdit: (credential: CredentialDto) => void;
  onChangePassword: (credential: CredentialDto) => void;
  onHistory: (credential: CredentialDto) => void;
  onDelete: (credential: CredentialDto) => void;
  canWrite?: boolean;
  canDelete?: boolean;
  canReveal?: boolean;
}

export function getCredentialColumns(
  actions: CredentialColumnActions,
): TableColumn<CredentialDto>[] {
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
      label: "Username / Identity",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm text-foreground">
          {row.username}
        </span>
      ),
    },
    {
      id: "employee_id",
      label: "Assigned To",
      sortable: true,
      render: (row) =>
        row.employee ? (
          <Link
            to={PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.employee.id))}
            className="font-medium text-primary hover:underline text-sm"
          >
            {row.employee.first_name} {row.employee.last_name} (
            {row.employee.employee_code})
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "provided_by",
      label: "Origin",
      sortable: true,
      render: (row) =>
        row.provided_by === PROVIDED_BY.COMPANY ? (
          <Badge
            variant="outline"
            className="text-blue-600 border-blue-300 dark:text-blue-400"
          >
            Company
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-purple-600 border-purple-300 dark:text-purple-400"
          >
            Employee
          </Badge>
        ),
    },
    {
      id: "approval_status",
      label: "Approval",
      sortable: true,
      render: (row) => {
        switch (row.approval_status) {
          case CREDENTIAL_APPROVAL_STATUS.APPROVED:
            return <Badge variant="success">Approved</Badge>;
          case CREDENTIAL_APPROVAL_STATUS.PENDING:
            return <Badge variant="warning">Pending Review</Badge>;
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
            return <Badge variant="muted">Unknown</Badge>;
        }
      },
    },
    {
      id: "expires_at",
      label: "Expiry",
      sortable: true,
      render: (row) => {
        if (!row.expires_at) {
          return <span className="text-xs text-muted-foreground">Never</span>;
        }
        const expDate = new Date(row.expires_at);
        const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
        const formatted = expDate.toLocaleDateString();

        if (daysLeft < 0) {
          return (
            <Badge variant="destructive" className="text-xs">
              Expired ({formatted})
            </Badge>
          );
        }
        if (daysLeft <= 30) {
          return (
            <Badge variant="warning" className="text-xs">
              Expiring in {daysLeft}d
            </Badge>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">{formatted}</span>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const menuActions: RowAction[] = [];

        if (actions.canReveal !== false) {
          menuActions.push({
            key: "reveal",
            label: "Reveal password",
            icon: Eye,
            onSelect: () => actions.onReveal(row),
          });
        }

        if (actions.canWrite !== false) {
          menuActions.push({
            key: "edit",
            label: "Edit details",
            icon: Pencil,
            onSelect: () => actions.onEdit(row),
          });
          menuActions.push({
            key: "rotate",
            label: "Rotate password",
            icon: RefreshCw,
            onSelect: () => actions.onChangePassword(row),
          });
        }

        menuActions.push({
          key: "history",
          label: "View audit trail",
          icon: History,
          onSelect: () => actions.onHistory(row),
        });

        if (actions.canDelete !== false) {
          menuActions.push({
            key: "delete",
            label: "Revoke / Delete",
            icon: Trash2,
            destructive: true,
            separatorBefore: true,
            onSelect: () => actions.onDelete(row),
          });
        }

        return (
          <RowActionsMenu label="Credential actions" actions={menuActions} />
        );
      },
    },
  ];
}
