import type { FilterField } from "@/components/common/TableFilters/types";
import { endPoints } from "@/api/endpoint";

export const maintenanceFilters: FilterField[] = [
  { key: "asset_id", label: "Asset", type: "async-select", endpoint: endPoints.asset.options },
  { key: "vendor_id", label: "Vendor", type: "async-select", endpoint: "vendor/options" },
  { key: "maintenance_status", label: "Status", type: "multiselect", options: [{ value: 1, label: "In maintenance" }, { value: 2, label: "Completed" }] },
  { key: "sent_at", label: "Sent date", type: "daterange" },
];
