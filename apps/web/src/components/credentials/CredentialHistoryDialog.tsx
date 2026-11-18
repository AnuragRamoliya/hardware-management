import { useMemo } from "react";
import { History, KeyRound, RefreshCw, Pencil, Check } from "lucide-react";
import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import { Timeline, type TimelineItem } from "@/components/common/DataDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredentialHistory } from "@/hooks/queries/credentials";
import type { CredentialDto, CredentialHistoryDto } from "@/api/credentials";

export interface CredentialHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

function getChangeIcon(changeType: string) {
  switch (changeType.toLowerCase()) {
    case "password_change":
    case "password_rotate":
    case "rotate":
      return <RefreshCw className="h-3.5 w-3.5" />;
    case "created":
      return <KeyRound className="h-3.5 w-3.5" />;
    case "approved":
      return <Check className="h-3.5 w-3.5 text-success" />;
    case "updated":
      return <Pencil className="h-3.5 w-3.5" />;
    default:
      return <History className="h-3.5 w-3.5" />;
  }
}

export function CredentialHistoryDialog({
  open,
  onOpenChange,
  credential,
}: CredentialHistoryDialogProps) {
  const { data: rawHistory = [], isLoading } = useCredentialHistory(
    credential?.id || 0,
    open && Boolean(credential?.id),
  );

  const history = rawHistory as CredentialHistoryDto[];

  const timelineItems = useMemo<TimelineItem[]>(() => {
    return history.map((record) => {
      const actor = record.user
        ? `${record.user.first_name} ${record.user.last_name}`
        : `User #${record.changed_by}`;

      let metaText = "";
      if (record.meta && Object.keys(record.meta).length > 0) {
        metaText = Object.entries(record.meta)
          .map(
            ([k, v]) =>
              `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`,
          )
          .join(" • ");
      }

      return {
        id: record.id,
        title: record.change_type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        time: new Date(record.created_at).toLocaleString(),
        description: metaText ? `By ${actor} — ${metaText}` : `By ${actor}`,
        icon: getChangeIcon(record.change_type),
      };
    });
  }, [history]);

  if (!credential) return null;

  const summaryCard = (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground text-sm">
          {credential.label}
        </span>
        {credential.credential_type && (
          <Badge variant="outline">{credential.credential_type.name}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Username / ID:</span>
        <span className="font-mono text-foreground">{credential.username}</span>
      </div>
      {credential.employee && (
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Assigned to:</span>
          <span className="font-medium text-foreground">
            {credential.employee.first_name} {credential.employee.last_name}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Credential Audit Trail"
      description={`Lifecycle event history for ${credential.label}.`}
      summaryCard={summaryCard}
    >
      <div className="py-2 space-y-4">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No history records recorded for this account.
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto px-1">
            <Timeline items={timelineItems} />
          </div>
        )}

        <div className="pt-2 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </ActionDialogLayout>
  );
}
