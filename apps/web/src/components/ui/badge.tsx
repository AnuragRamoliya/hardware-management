import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  "default" | "success" | "warning" | "danger" | "info" | "muted";
const styles: Record<BadgeVariant, string> = {
  default: "bg-accent text-accent-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  muted: "bg-muted text-muted-foreground",
};
export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
