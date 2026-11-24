import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "../ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  variant?: "destructive" | "warning" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--overlay)/.45)]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl">
          <AlertDialog.Title className="text-base font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={variant === "destructive" ? "destructive" : "primary"}
                onClick={onConfirm}
              >
                {confirmText}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
