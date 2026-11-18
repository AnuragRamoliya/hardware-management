import { Badge } from "@/components/ui/badge";
import { ASSET_STATUS, getAssetStatusLabel } from "@/utils/constants";

export function AssetStatusBadge({ status }: { status?: number }) {
  const item = ASSET_STATUS.find((option) => option.value === status);
  const variant =
    item?.tone === "success"
      ? "success"
      : item?.tone === "warning"
        ? "warning"
        : item?.tone === "muted"
          ? "muted"
          : item?.tone === "danger"
            ? "danger"
            : "info";
  return <Badge variant={variant}>{getAssetStatusLabel(status)}</Badge>;
}
