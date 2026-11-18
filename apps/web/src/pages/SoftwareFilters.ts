import type { FilterField } from "@/components/common/TableFilters/types";
import { SOFTWARE_CATEGORIES, SOFTWARE_LICENSE_TYPES } from "@/utils/constants";

export const softwareFilters: FilterField[] = [
  {
    key: "category",
    label: "Category",
    type: "multiselect",
    options: [...SOFTWARE_CATEGORIES],
  },
  {
    key: "license_type",
    label: "License type",
    type: "multiselect",
    options: [...SOFTWARE_LICENSE_TYPES],
  },
  {
    key: "vendor_id",
    label: "Vendor",
    type: "async-select",
    endpoint: "vendor/options",
    multiple: true,
  },
  { key: "renewal_date", label: "Renewal date", type: "daterange" },
  { key: "has_available_seats", label: "Has available seats", type: "boolean" },
];
