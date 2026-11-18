import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";
const variants: Record<AlertVariant, { className: string; icon: typeof Info }> =
  {
    info: { className: "border-info/25 bg-info/10 text-info", icon: Info },
    success: {
      className: "border-success/25 bg-success/10 text-success",
      icon: CheckCircle2,
    },
    warning: {
      className: "border-warning/25 bg-warning/10 text-warning",
      icon: TriangleAlert,
    },
    danger: {
      className: "border-danger/25 bg-danger/10 text-danger",
      icon: AlertCircle,
    },
  };

export function Alert({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children?: ReactNode;
  variant?: AlertVariant;
}) {
  const Icon = variants[variant].icon;
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        variants[variant].className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {children && (
          <div className="mt-1 text-xs leading-5 opacity-90">{children}</div>
        )}
      </div>
    </div>
  );
}
