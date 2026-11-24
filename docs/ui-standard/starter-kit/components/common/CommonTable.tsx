import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { EmptyState } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface CommonTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

export function CommonTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search criteria.",
  pageSize = 10,
}: CommonTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(term),
      ),
    );
  }, [data, searchTerm]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative flex items-center max-w-sm">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-medium whitespace-nowrap"
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span>{col.header}</span>
                    {col.sortable && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, sorted.length)} of {sorted.length}{" "}
            entries
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
