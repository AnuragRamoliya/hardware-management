import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { CommonTable, type TableColumn } from "./CommonTable";
import type { ListQuery } from "@/types";
import type { FilterField } from "./TableFilters/types";

export interface ListPageScaffoldProps<T extends { id: string | number }> {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string; href?: string }>;
  columns: TableColumn<T>[];
  rows: T[];
  count: number;
  query: ListQuery;
  onQueryChange: (query: Partial<ListQuery>) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  filterFields?: FilterField[];
  onRowClick?: (row: T) => void;
  onBulkAction?: (ids: Array<T["id"]>) => void;
  emptyTitle?: string;
}

export function ListPageScaffold<T extends { id: string | number }>({
  title,
  description,
  action,
  breadcrumbs,
  columns,
  rows,
  count,
  query,
  onQueryChange,
  loading,
  error,
  onRetry,
  filterFields,
  onRowClick,
  onBulkAction,
  emptyTitle,
}: ListPageScaffoldProps<T>) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={action}
        breadcrumbs={breadcrumbs?.map((b) => ({
          label: b.label,
          to: b.to ?? b.href,
        }))}
      />
      <CommonTable
        columns={columns}
        rows={rows}
        count={count}
        query={query}
        onQueryChange={onQueryChange}
        loading={loading}
        error={error}
        onRetry={onRetry}
        filterFields={filterFields}
        onRowClick={onRowClick}
        onBulkAction={onBulkAction}
        emptyTitle={emptyTitle}
      />
    </div>
  );
}
