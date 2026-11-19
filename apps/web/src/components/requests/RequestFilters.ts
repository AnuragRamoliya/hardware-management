import type { FilterField } from "@/components/common/TableFilters/types";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_PRIORITY_LABELS,
} from "@hm/shared";

export const requestFilters: FilterField[] = [
  {
    key: "request_type",
    label: "Request type",
    type: "select",
    options: Object.entries(REQUEST_TYPE_LABELS).map(([val, label]) => ({
      value: Number(val),
      label,
    })),
  },
  {
    key: "request_status",
    label: "Status",
    type: "select",
    options: Object.entries(REQUEST_STATUS_LABELS).map(([val, label]) => ({
      value: Number(val),
      label,
    })),
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: Object.entries(REQUEST_PRIORITY_LABELS).map(([val, label]) => ({
      value: Number(val),
      label,
    })),
  },
  {
    key: "employee_id",
    label: "Employee",
    type: "async-select",
    endpoint: "employee/options",
    multiple: true,
  },
  {
    key: "category_id",
    label: "Asset category",
    type: "async-select",
    endpoint: "asset-category/options",
    multiple: true,
  },
  {
    key: "created",
    label: "Created date",
    type: "daterange",
  },
  {
    key: "needed_by",
    label: "Needed by date",
    type: "daterange",
  },
  {
    key: "sla_breached",
    label: "SLA breached",
    type: "boolean",
  },
  {
    key: "awaiting_stock",
    label: "Awaiting stock",
    type: "boolean",
  },
];
