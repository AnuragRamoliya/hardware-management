import type { FilterField } from "@/components/common/TableFilters/types";
import { CREDENTIAL_CATEGORIES } from "@hm/shared";

export const credentialTypeFilters: FilterField[] = [
  {
    key: "category",
    label: "Category",
    type: "select",
    options: CREDENTIAL_CATEGORIES.map((cat) => ({
      label: cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: cat,
    })),
  },
  {
    key: "requires_approval",
    label: "Requires Approval",
    type: "select",
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    key: "allow_employee_submit",
    label: "Employee Submit",
    type: "select",
    options: [
      { label: "Allowed", value: "true" },
      { label: "Disallowed", value: "false" },
    ],
  },
];
