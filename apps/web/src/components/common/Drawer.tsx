import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-xl translate-x-0 translate-y-0 rounded-none p-0 sm:rounded-l-2xl">
        <div className="border-b p-6">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
