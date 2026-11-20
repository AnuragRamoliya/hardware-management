import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { getStatusLabel, getStatusTone } from "@/utils/constants";

export function StatusBadge({
  status,
  label: customLabel,
  tone: customTone,
  className,
}: {
  status?: string | number;
  label?: string;
  tone?: string;
  className?: string;
}) {
  const label = customLabel ?? (getStatusLabel(status) || "unknown");
  let variant: BadgeVariant = "default";
  if (customTone) {
    if (customTone === "secondary") variant = "muted";
    else if (customTone === "danger" || customTone === "destructive")
      variant = "destructive";
    else if (customTone === "warning") variant = "warning";
    else if (customTone === "success") variant = "success";
    else if (customTone === "info") variant = "info";
    else if (customTone === "muted") variant = "muted";
    else if (customTone === "purple") variant = "purple";
  } else {
    variant = getStatusTone(status);
  }
  return (
    <Badge variant={variant} className={className}>
      {label.replaceAll("_", " ")}
    </Badge>
  );
}
