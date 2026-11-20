import type { FilterField } from "@/components/common/TableFilters/types";
import {
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_CASE_STATUS_LABELS,
} from "@hm/shared";

export const offboardingFilters: FilterField[] = [
  {
    key: "status",
    label: "Case status",
    type: "select",
    options: Object.values(OFFBOARDING_CASE_STATUS).map((status) => ({
      value: status,
      label: OFFBOARDING_CASE_STATUS_LABELS[status] ?? status,
    })),
  },
  {
    key: "department_id",
    label: "Department",
    type: "async-select",
    endpoint: "department/options",
    multiple: true,
  },
  {
    key: "last_working_day",
    label: "Last working day",
    type: "daterange",
  },
];
