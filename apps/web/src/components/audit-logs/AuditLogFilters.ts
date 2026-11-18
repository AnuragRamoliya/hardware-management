import type { FilterField } from "@/components/common/TableFilters/types";

export const auditLogFilters: FilterField[] = [
  {
    key: "module_id",
    label: "Module",
    type: "async-select",
    endpoint: "module/options",
  },
  {
    key: "user_id",
    label: "User",
    type: "async-select",
    endpoint: "user/options",
  },
  {
    key: "action",
    label: "Action",
    type: "select",
    options: [
      { value: "created", label: "Created" },
      { value: "updated", label: "Updated" },
      { value: "deleted", label: "Deleted" },
      { value: "permissions_updated", label: "Permissions updated" },
    ],
  },
  { key: "createdAt", label: "Date range", type: "daterange" },
];
