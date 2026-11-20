import type React from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { getStatusLabel, getStatusTone } from "@/utils/constants";

export function StatusBadge({
  status,
  label: customLabel,
  tone: customTone,
  className,
}: {
  status?: string | number;
  label?: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  const rawLabel =
    customLabel !== undefined && customLabel !== null
      ? customLabel
      : getStatusLabel(status) ||
        (status !== undefined && status !== null ? String(status) : "unknown");

  const displayText =
    typeof rawLabel === "string"
      ? rawLabel.replace(/_/g, " ")
      : typeof rawLabel === "number"
        ? String(rawLabel)
        : rawLabel;

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
      {displayText}
    </Badge>
  );
}
