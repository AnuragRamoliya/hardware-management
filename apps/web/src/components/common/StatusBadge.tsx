import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { getStatusLabel, getStatusTone } from "@/utils/constants";

export type StatusBadgeTone =
  | "default"
  | "muted"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "destructive"
  | "info"
  | "purple";

export interface StatusBadgeProps {
  status?: string;
  labelMap?: Record<string, string>;
  label?: string;
  tone?: StatusBadgeTone;
  className?: string;
}

export function StatusBadge({
  status,
  labelMap,
  label: customLabel,
  tone: customTone,
  className,
}: StatusBadgeProps) {
  const mappedLabel = status && labelMap ? labelMap[status] : undefined;
  const rawLabel =
    customLabel ??
    mappedLabel ??
    (status !== undefined && status !== null && status !== ""
      ? getStatusLabel(status) || status
      : "Unknown");

  const displayText =
    typeof rawLabel === "string" && rawLabel.trim() !== ""
      ? rawLabel.replace(/_/g, " ")
      : "Unknown";

  let variant: BadgeVariant = "default";
  if (customTone) {
    if (customTone === "secondary" || customTone === "muted") {
      variant = "muted";
    } else if (customTone === "danger" || customTone === "destructive") {
      variant = "destructive";
    } else if (customTone === "warning") {
      variant = "warning";
    } else if (customTone === "success") {
      variant = "success";
    } else if (customTone === "info") {
      variant = "info";
    } else if (customTone === "purple") {
      variant = "purple";
    }
  } else {
    variant = status ? getStatusTone(status) : "muted";
  }

  return (
    <Badge variant={variant} className={className}>
      {displayText}
    </Badge>
  );
}
