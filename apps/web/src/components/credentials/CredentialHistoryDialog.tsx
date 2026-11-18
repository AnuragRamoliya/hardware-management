import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useCredentialHistory } from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";

interface CredentialHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

export function CredentialHistoryDialog({
  open,
  onOpenChange,
  credential,
}: CredentialHistoryDialogProps) {
  const { data: history = [], isLoading } = useCredentialHistory(
    credential?.id || 0,
    open && Boolean(credential?.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <DialogTitle>Credential Audit Trail</DialogTitle>
          </div>
          <DialogDescription>
            Lifecycle history for {credential?.label || "account"}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Loading audit trail...
            </p>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No history records found.
            </p>
          ) : (
            <div className="relative border-l border-muted pl-4 ml-2 space-y-4">
              {history.map((record) => (
                <div key={record.id} className="relative space-y-1">
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize text-foreground">
                      {record.change_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(record.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>By:</span>
                    <span className="font-medium text-foreground">
                      {record.user
                        ? `${record.user.first_name} ${record.user.last_name}`
                        : `User #${record.changed_by}`}
                    </span>
                  </div>
                  {record.meta && Object.keys(record.meta).length > 0 && (
                    <div className="mt-1 p-2 bg-muted/40 rounded text-[11px] font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(record.meta, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
