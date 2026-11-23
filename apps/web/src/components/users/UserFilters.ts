import type { FilterField } from "@/components/common/TableFilters/types";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";

export const userFilters: FilterField[] = [
  {
    key: "role_id",
    label: "Role",
    type: "async-select",
    endpoint: "role/options",
    multiple: true,
  },
  RECORD_STATUS_FILTER,
];
