import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

export interface ActionDialogLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  summaryCard?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export function ActionDialogLayout({
  open,
  onOpenChange,
  title,
  description,
  summaryCard,
  children,
  maxWidth = "sm:max-w-md",
}: ActionDialogLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <div>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {summaryCard && <Card className="p-3 bg-muted/30">{summaryCard}</Card>}
        <div className="mt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
