import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExportsDrawer } from "@/components/reports/ExportsDrawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { callApi } from "@/api/callApi";
import useAuthStore from "@/zustand/user-store";
import type { ReportMetadataDto, ReportRunResultDto } from "@hm/shared";
import type { ListQuery } from "@/types";
import { Download, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";

type ReportRow = { id: string | number } & Record<string, unknown>;

export function ReportPage() {
  const { key = "" } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [query, setQuery] = useState<ListQuery>({
    currentPage: 1,
    itemsPerPage: 20,
    filters: {},
    sortBy: [],
    general_search: "",
  });

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "pdf">(
    "csv",
  );
  const [preferAsync, setPreferAsync] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportsDrawerOpen, setExportsDrawerOpen] = useState(false);

  // 1. Fetch metadata
  const { data: meta, isLoading: isMetaLoading } = useQuery<ReportMetadataDto>({
    queryKey: ["report-meta", key],
    queryFn: async () => {
      const res = await callApi<ReportMetadataDto>({
        url: `reports/meta/${key}`,
        method: "GET",
      });
      if (!res.ok || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: !!key,
  });

  // 2. Fetch report dataset
  const {
    data: reportResult,
    isLoading: isDataLoading,
    error,
    refetch,
  } = useQuery<ReportRunResultDto>({
    queryKey: [
      "report-run",
      key,
      query.currentPage,
      query.itemsPerPage,
      query.filters,
    ],
    queryFn: async () => {
      const res = await callApi<ReportRunResultDto>({
        url: `reports/run/${key}`,
        method: "POST",
        body: {
          filters: query.filters,
          currentPage: query.currentPage,
          itemsPerPage: query.itemsPerPage,
        },
      });
      if (!res.ok || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: !!key && !!meta,
  });

  const handleQueryChange = useCallback((newQ: Partial<ListQuery>) => {
    setQuery((prev) => ({ ...prev, ...newQ }));
  }, []);

  // Dynamically map columns
  const tableColumns = useMemo<TableColumn<ReportRow>[]>(() => {
    if (!meta?.columns) return [];
    return meta.columns.map((col) => ({
      id: col.key,
      label: col.label,
      sortable: col.sortable ?? true,
      render: (row: ReportRow) => {
        const val = row[col.key];
        if (val === null || val === undefined || val === "")
          return <span className="text-muted-foreground">—</span>;

        if (col.type === "currency") {
          return (
            <span className="font-medium tabular-nums">
              $
              {Number(val).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        }

        if (col.type === "date") {
          const d = new Date(String(val));
          return (
            <span className="text-xs text-muted-foreground tabular-nums">
              {isNaN(d.getTime()) ? String(val) : d.toISOString().slice(0, 10)}
            </span>
          );
        }

        if (col.type === "enum") {
          const str = String(val).toLowerCase();
          const tone =
            str === "active" ||
            str === "assigned" ||
            str === "verified" ||
            str === "fulfilled" ||
            str === "within_sla"
              ? "active"
              : str === "pending" ||
                  str === "in_progress" ||
                  str === "under_repair" ||
                  str === "expiring_soon"
                ? "pending"
                : str === "expired" ||
                    str === "breached" ||
                    str === "unrepairable" ||
                    str === "rejected"
                  ? "rejected"
                  : "neutral";
          return (
            <StatusBadge status={tone} label={String(val).toUpperCase()} />
          );
        }

        return (
          <span className="text-xs font-normal text-foreground">
            {String(val)}
          </span>
        );
      },
    }));
  }, [meta]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = useAuthStore.getState().token;
      const API_URL = import.meta.env.VITE_HOST_API ?? "";
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const isAsyncNeeded = preferAsync || (reportResult?.count || 0) > 5000;

      const response = await fetch(`${baseUrl}/reports/export/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token || "",
          "plain-text": "true",
        },
        body: JSON.stringify({
          format: exportFormat,
          async: isAsyncNeeded,
          filters: query.filters,
        }),
      });

      if (!response.ok) {
        throw new Error("Export request failed");
      }

      if (isAsyncNeeded) {
        toast.success("Large dataset queued as background export task.");
        setExportModalOpen(false);
        setExportsDrawerOpen(true);
      } else {
        // Direct download blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const nowStr = new Date().toISOString().slice(0, 10);
        link.setAttribute(
          "download",
          `${key}_report_${nowStr}.${exportFormat}`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success(
          `Report downloaded successfully as ${exportFormat.toUpperCase()}`,
        );
        setExportModalOpen(false);
      }
    } catch {
      toast.error("Export request failed. Please check parameters.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isMetaLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-muted/60 rounded" />
          <div className="h-20 bg-muted/60 rounded" />
          <div className="h-20 bg-muted/60 rounded" />
        </div>
        <div className="h-64 bg-muted/40 rounded" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">
          Report Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested report key '{key}' does not exist or you lack permission
          to view it.
        </p>
        <Button variant="outline" onClick={() => navigate("/reports")}>
          Back to Catalogue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.title}
        description={meta.description}
        breadcrumbs={[
          { label: "Reports", to: "/reports" },
          { label: meta.title },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportsDrawerOpen(true)}
              className="flex items-center gap-1.5"
            >
              <HardDriveDownload className="h-4 w-4" />
              <span>Export Tasks</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards Strip */}
      {reportResult?.summary && reportResult.summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reportResult.summary.map((kpi, idx) => (
            <Card key={idx} className="p-4 border">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {typeof kpi.value === "number"
                  ? kpi.value.toLocaleString()
                  : kpi.value}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Common Table with Pagination & Controls */}
      <CommonTable<ReportRow>
        columns={tableColumns}
        rows={(reportResult?.rows as unknown as ReportRow[]) || []}
        count={reportResult?.count || 0}
        query={query}
        onQueryChange={handleQueryChange}
        loading={isDataLoading}
        error={error ? "Failed to fetch report dataset" : undefined}
        onRetry={() => refetch()}
        emptyTitle={`No records found for ${meta.title}`}
      />

      {/* Export Options Dialog */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Report Dataset</DialogTitle>
            <DialogDescription>
              Export {reportResult?.count?.toLocaleString() || 0} matching
              records in your preferred format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                File Format
              </label>
              <Select
                value={exportFormat}
                onValueChange={(val: string) =>
                  setExportFormat(val as "csv" | "xlsx" | "pdf")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    CSV (Comma Separated Values - UTF-8 BOM)
                  </SelectItem>
                  <SelectItem value="xlsx">
                    XLSX (Microsoft Excel Spreadsheet)
                  </SelectItem>
                  <SelectItem value="pdf">
                    PDF (Printable Document Format - Landscape)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="prefer-async"
                checked={preferAsync}
                onChange={(e) => setPreferAsync(e.target.checked)}
              />
              <label
                htmlFor="prefer-async"
                className="text-xs text-foreground cursor-pointer"
              >
                Run as background export task
              </label>
            </div>

            {(reportResult?.count || 0) > 5000 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                Notice: Dataset exceeds 5,000 rows. This file will be processed
                as a background task.
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Generating..." : "Start Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Background Exports Drawer */}
      <ExportsDrawer
        open={exportsDrawerOpen}
        onOpenChange={setExportsDrawerOpen}
      />
    </div>
  );
}
export default ReportPage;
