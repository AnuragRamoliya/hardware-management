import type { FilterField } from "@/components/common/TableFilters/types";
import { ASSET_CONDITIONS, ASSET_STATUS } from "@/utils/constants";

export const assetFilters: FilterField[] = [
  {
    key: "category_id",
    label: "Category",
    type: "async-select",
    endpoint: "asset_category/options",
    multiple: true,
  },
  {
    key: "asset_status",
    label: "Status",
    type: "multiselect",
    options: ASSET_STATUS.map(({ value, label }) => ({ value, label })),
  },
  {
    key: "condition",
    label: "Condition",
    type: "multiselect",
    options: [...ASSET_CONDITIONS],
  },
  {
    key: "vendor_id",
    label: "Vendor",
    type: "async-select",
    endpoint: "vendor/options",
    multiple: true,
  },
  {
    key: "location_id",
    label: "Location",
    type: "async-select",
    endpoint: "location/options",
    multiple: true,
  },
  {
    key: "assigned_employee_id",
    label: "Assigned employee",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  { key: "purchase_date", label: "Purchase date", type: "daterange" },
  { key: "warranty_end", label: "Warranty end", type: "daterange" },
  { key: "unassigned", label: "Unassigned only", type: "boolean" },
];
