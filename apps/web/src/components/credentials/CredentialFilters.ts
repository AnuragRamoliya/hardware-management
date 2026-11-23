import type { FilterField } from "@/components/common/TableFilters/types";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";
import { CREDENTIAL_APPROVAL_STATUS, PROVIDED_BY } from "@hm/shared";

export const credentialFilters: FilterField[] = [
  {
    key: "employee_id",
    label: "Employee",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  {
    key: "credential_type_id",
    label: "Credential type",
    type: "async-select",
    endpoint: "credential-type/options",
    multiple: true,
  },
  {
    key: "approval_status",
    label: "Approval status",
    type: "select",
    options: [
      { label: "Pending", value: String(CREDENTIAL_APPROVAL_STATUS.PENDING) },
      { label: "Approved", value: String(CREDENTIAL_APPROVAL_STATUS.APPROVED) },
      { label: "Rejected", value: String(CREDENTIAL_APPROVAL_STATUS.REJECTED) },
      {
        label: "Needs Change",
        value: String(CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE),
      },
    ],
  },
  {
    key: "provided_by",
    label: "Provided by",
    type: "select",
    options: [
      { label: "Company", value: String(PROVIDED_BY.COMPANY) },
      { label: "Employee", value: String(PROVIDED_BY.EMPLOYEE) },
    ],
  },
  { key: "expires_at", label: "Expiry date", type: "daterange" },
  RECORD_STATUS_FILTER,
];

export const approvalQueueFilters: FilterField[] = [
  {
    key: "employee_id",
    label: "Employee",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  {
    key: "credential_type_id",
    label: "Credential type",
    type: "async-select",
    endpoint: "credential-type/options",
    multiple: true,
  },
];

export const accessLogFilters: FilterField[] = [
  {
    key: "accessed_by",
    label: "Accessed by",
    type: "async-select",
    endpoint: "user/options",
    multiple: true,
  },
  {
    key: "employee_id",
    label: "Employee owner",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  {
    key: "action",
    label: "Action",
    type: "select",
    options: [
      { label: "Reveal", value: "reveal" },
      { label: "Copy", value: "copy" },
      { label: "Export", value: "export" },
    ],
  },
  { key: "accessed_at", label: "Access date", type: "daterange" },
];
