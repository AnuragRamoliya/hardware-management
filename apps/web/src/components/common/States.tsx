import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {label}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 rounded-2xl bg-accent p-3 text-primary">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <AlertCircle className="h-5 w-5 text-danger" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
