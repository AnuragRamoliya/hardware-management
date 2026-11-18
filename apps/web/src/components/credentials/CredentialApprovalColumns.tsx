import { Link } from "react-router-dom";
import { Check, Edit3, X } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { PATHS } from "@/routes/paths";
import type { CredentialDto } from "@/api/credentials";
import { CREDENTIAL_APPROVAL_STATUS } from "@hm/shared";

export interface CredentialApprovalColumnActions {
  onApprove: (credential: CredentialDto) => void;
  onNeedsChange: (credential: CredentialDto) => void;
  onReject: (credential: CredentialDto) => void;
  canApprove?: boolean;
}

export function getCredentialApprovalColumns(
  actions: CredentialApprovalColumnActions,
): TableColumn<CredentialDto>[] {
  const { onApprove, onNeedsChange, onReject, canApprove = true } = actions;

  return [
    {
      id: "label",
      label: "Account / Service",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.label}</span>
          {row.credential_type && (
            <div className="text-xs text-muted-foreground">
              {row.credential_type.name}
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
      id: "employee",
      label: "Submitted By",
      sortable: true,
      render: (row) =>
        row.employee ? (
          <Link
            to={PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.employee.id))}
            className="text-sm font-medium text-primary hover:underline"
          >
            {row.employee.first_name} {row.employee.last_name} (
            {row.employee.employee_code})
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "approval_status",
      label: "Current Status",
      sortable: true,
      render: (row) =>
        row.approval_status === CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE ? (
          <Badge variant="outline">Needs Changes</Badge>
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
      label: "Actions",
      sortable: false,
      render: (row) => {
        const rowActions: RowAction[] = [];

        if (canApprove) {
          rowActions.push(
            {
              label: "Approve",
              icon: Check,
              onSelect: () => onApprove(row),
            },
            {
              label: "Request Changes",
              icon: Edit3,
              onSelect: () => onNeedsChange(row),
            },
            {
              label: "Reject",
              icon: X,
              destructive: true,
              separatorBefore: true,
              onSelect: () => onReject(row),
            },
          );
        }

        return <RowActionsMenu actions={rowActions} />;
      },
    },
  ];
}
