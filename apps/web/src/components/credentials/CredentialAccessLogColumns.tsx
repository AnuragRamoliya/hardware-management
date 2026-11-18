import type { TableColumn } from "@/components/common/CommonTable";
import { Badge } from "@/components/ui/badge";
import type { CredentialAccessLogDto } from "@/api/credentials";

export function getCredentialAccessLogColumns(): TableColumn<CredentialAccessLogDto>[] {
  return [
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
          {row.hash ? `${row.hash.slice(0, 10)}...${row.hash.slice(-6)}` : "—"}
        </div>
      ),
    },
  ];
}
