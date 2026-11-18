import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/States";
import { useDebounce } from "@/hooks/use-debounce";
import { useExportCsv } from "@/hooks/use-export-csv";
import type { ListQuery } from "@/types";
import {
  TableFilterButton,
  TableFilterPanel,
} from "@/components/common/TableFilters/TableFilterPanel";
import type { FilterField } from "@/components/common/TableFilters/types";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TableColumn<T> {
  id: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface CommonTableProps<T extends { id: string | number }> {
  columns: TableColumn<T>[];
  rows: T[];
  count: number;
  query: ListQuery;
  onQueryChange: (query: Partial<ListQuery>) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  onBulkAction?: (ids: Array<T["id"]>) => void;
  emptyTitle?: string;
  filterFields?: FilterField[];
}

export function CommonTable<T extends { id: string | number }>({
  columns,
  rows,
  count,
  query,
  onQueryChange,
  loading = false,
  error,
  onRetry,
  onRowClick,
  onBulkAction,
  emptyTitle = "No records found",
  filterFields = [],
}: CommonTableProps<T>) {
  const [search, setSearch] = useState(query.general_search ?? "");
  const [visible, setVisible] = useState<string[]>(
    columns.map((column) => column.id),
  );
  const [compact, setCompact] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Array<T["id"]>>([]);
  const exportCsv = useExportCsv<T>();
  const debouncedSearch = useDebounce(search);
  const shownColumns = useMemo(
    () => columns.filter((column) => visible.includes(column.id)),
    [columns, visible],
  );
  useEffect(() => {
    onQueryChange({ currentPage: 1, general_search: debouncedSearch });
  }, [debouncedSearch, onQueryChange]);

  const sortBy = (column: TableColumn<T>) => {
    if (column.sortable === false) return;
    const current = query.sortBy[0];
    onQueryChange({
      sortBy: [
        {
          id: column.id,
          value:
            current?.id === column.id && current.value === "asc"
              ? "desc"
              : "asc",
        },
      ],
    });
  };
  const pageCount = Math.max(1, Math.ceil(count / query.itemsPerPage));
  const toggleRow = (id: T["id"]) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  if (error)
    return (
      <div role="alert" className="p-8 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  return (
    <section
      aria-label="Data table"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search records</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </label>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onBulkAction?.(selected)}
            >
              Bulk action ({selected.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                aria-label="Table display options"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">View</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>View settings</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={compact}
                onCheckedChange={setCompact}
              >
                Compact rows
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visible.includes(column.id)}
                  onCheckedChange={(checked) =>
                    setVisible((previous) =>
                      checked
                        ? [...previous, column.id]
                        : previous.filter((id) => id !== column.id),
                    )
                  }
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {filterFields.length > 0 && (
            <TableFilterButton
              value={query.filters ?? {}}
              open={filtersOpen}
              onClick={() => setFiltersOpen((previous) => !previous)}
            />
          )}
          <Button
            aria-label="Export CSV"
            title="Export CSV"
            variant="outline"
            size="icon"
            onClick={() => exportCsv(rows, shownColumns, "export")}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {filterFields.length > 0 && (
        <TableFilterPanel
          config={filterFields}
          value={query.filters}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          showTrigger={false}
          onApply={(filters) => onQueryChange({ currentPage: 1, filters })}
          onReset={() => onQueryChange({ currentPage: 1, filters: {} })}
        />
      )}
      {rows.length === 0 && !loading ? (
        <EmptyState
          title={emptyTitle}
          description="Try adjusting your search or add a new record."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      aria-label="Select all rows"
                      type="checkbox"
                      checked={
                        rows.length > 0 && selected.length === rows.length
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked ? rows.map((row) => row.id) : [],
                        )
                      }
                    />
                  </th>
                  {shownColumns.map((column) => (
                    <th key={column.id} className="px-4 py-3 font-medium">
                      <button
                        className="inline-flex items-center gap-1"
                        onClick={() => sortBy(column)}
                      >
                        {column.label}
                        {query.sortBy[0]?.id === column.id ? (
                          query.sortBy[0].value === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr key={index}>
                        <td
                          colSpan={shownColumns.length + 1}
                          className="px-4 py-5"
                        >
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-muted/40 ${onRowClick ? "cursor-pointer" : ""}`}
                        onClick={() => onRowClick?.(row)}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            aria-label={`Select row ${row.id}`}
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            onChange={() => toggleRow(row.id)}
                          />
                        </td>
                        {shownColumns.map((column) => (
                          <td
                            key={column.id}
                            className={`px-4 ${compact ? "py-2" : "py-3"}`}
                          >
                            {column.render
                              ? column.render(row)
                              : String(
                                  column.id in row
                                    ? (row[column.id as keyof T] ?? "—")
                                    : "—",
                                )}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {loading ? (
              <div className="p-5">
                <div className="h-14 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              rows.map((row) => (
                <article
                  key={row.id}
                  className={`block w-full min-w-0 p-4 text-left hover:bg-muted/40 ${onRowClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" : ""}`}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (
                      onRowClick &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? `View record ${row.id}` : undefined}
                >
                  <div className="min-w-0 space-y-2">
                    {shownColumns.map((column, index) => (
                      <div
                        key={column.id}
                        className={`flex min-w-0 justify-between gap-3 ${index === 0 ? "font-semibold" : "text-sm"}`}
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {column.label}
                        </span>
                        <span className="min-w-0 max-w-[65%] break-words text-right">
                          {column.render
                            ? column.render(row)
                            : String(
                                column.id in row
                                  ? (row[column.id as keyof T] ?? "—")
                                  : "—",
                              )}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
      <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {count === 0
            ? "0 records"
            : `${(query.currentPage - 1) * query.itemsPerPage + 1}–${Math.min(query.currentPage * query.itemsPerPage, count)} of ${count} records`}
        </span>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <label>
            Rows{" "}
            <select
              aria-label="Rows per page"
              className="ml-1 rounded border bg-card px-2 py-1"
              value={query.itemsPerPage}
              onChange={(event) =>
                onQueryChange({
                  currentPage: 1,
                  itemsPerPage: Number(event.target.value),
                })
              }
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="flex gap-1">
            <Button
              aria-label="Previous page"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={query.currentPage <= 1}
              onClick={() =>
                onQueryChange({ currentPage: query.currentPage - 1 })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 py-2 tabular-nums">
              {query.currentPage} / {pageCount}
            </span>
            <Button
              aria-label="Next page"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={query.currentPage >= pageCount}
              onClick={() =>
                onQueryChange({ currentPage: query.currentPage + 1 })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {onBulkAction && (
        <div className="sr-only" aria-live="polite">
          {selected.length} selected
        </div>
      )}
    </section>
  );
}
