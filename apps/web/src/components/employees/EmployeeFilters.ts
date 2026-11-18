import type { FilterField } from "@/components/common/TableFilters/types";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";
import { ENUMS } from "@/utils/constants";

export const employeeFilters: FilterField[] = [
  {
    key: "department_id",
    label: "Department",
    type: "async-select",
    endpoint: "department/options",
    multiple: true,
  },
  {
    key: "designation_id",
    label: "Designation",
    type: "async-select",
    endpoint: "designation/options",
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
    key: "manager_id",
    label: "Manager",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  {
    key: "employment_status",
    label: "Employment status",
    type: "select",
    options: [...ENUMS.employmentStatus],
  },
  { key: "join_date", label: "Join date", type: "daterange" },
  RECORD_STATUS_FILTER,
];
