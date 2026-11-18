import { Badge } from "@/components/ui/badge";
import { getStatusLabel, getStatusTone } from "@/utils/constants";

export function StatusBadge({ status }: { status?: string | number }) {
  const label = getStatusLabel(status) || "unknown";
  const variant = getStatusTone(status);
  return <Badge variant={variant}>{label.replaceAll("_", " ")}</Badge>;
}
