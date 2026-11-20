import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/common/Drawer";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getSocket } from "@/lib/realtime";
import { callApi } from "@/api/callApi";
import useAuthStore from "@/zustand/user-store";
import {
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { REALTIME_EVENTS, type ExportJobDto } from "@hm/shared";
import { toast } from "sonner";

export function ExportsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const {
    data: jobs = [],
    isLoading,
    refetch,
  } = useQuery<ExportJobDto[]>({
    queryKey: ["export-jobs"],
    queryFn: async () => {
      const res = await callApi<ExportJobDto[]>({
        url: "reports/jobs/list",
        method: "POST",
        body: {},
      });
      if (!res.ok || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: open,
    refetchInterval: (query) => {
      const activeJobs = query.state.data?.some(
        (j) => j.job_status === "pending" || j.job_status === "processing",
      );
      return activeJobs ? 3000 : false;
    },
  });

  // Listen to realtime export socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = (
      eventData: Partial<ExportJobDto> & {
        job_id: number;
        status?: "pending" | "processing" | "completed" | "failed";
      },
    ) => {
      queryClient.setQueryData<ExportJobDto[]>(
        ["export-jobs"],
        (oldJobs = []) => {
          return oldJobs.map((j) => {
            if (j.id === eventData.job_id) {
              return {
                ...j,
                job_status: eventData.status || j.job_status,
                progress:
                  eventData.progress !== undefined
                    ? eventData.progress
                    : j.progress,
                file_sha256: eventData.file_sha256 || j.file_sha256,
                error: eventData.error || j.error,
                row_count: eventData.row_count || j.row_count,
              };
            }
            return j;
          });
        },
      );

      if (eventData.status === "completed") {
        toast.success(`Export job #${eventData.job_id} ready for download!`);
        void refetch();
      } else if (eventData.status === "failed") {
        toast.error(
          `Export job #${eventData.job_id} failed: ${eventData.error || "Unknown error"}`,
        );
      }
    };

    socket.on(REALTIME_EVENTS.EXPORT_JOB_STARTED, handleUpdate);
    socket.on(REALTIME_EVENTS.EXPORT_JOB_PROGRESS, handleUpdate);
    socket.on(REALTIME_EVENTS.EXPORT_JOB_COMPLETED, handleUpdate);
    socket.on(REALTIME_EVENTS.EXPORT_JOB_FAILED, handleUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.EXPORT_JOB_STARTED, handleUpdate);
      socket.off(REALTIME_EVENTS.EXPORT_JOB_PROGRESS, handleUpdate);
      socket.off(REALTIME_EVENTS.EXPORT_JOB_COMPLETED, handleUpdate);
      socket.off(REALTIME_EVENTS.EXPORT_JOB_FAILED, handleUpdate);
    };
  }, [queryClient, refetch]);

  const handleDownload = async (job: ExportJobDto) => {
    try {
      const token = useAuthStore.getState().token;
      const API_URL = import.meta.env.VITE_HOST_API ?? "";
      const response = await fetch(
        `${API_URL}/reports/jobs/download/${job.id}`,
        {
          headers: {
            token: token || "",
            "plain-text": "true",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${job.report_key}_export_${job.id}.${job.format}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download export file. It may have expired.");
    }
  };

  const getFormatIcon = (format: string) => {
    if (format === "xlsx")
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Background Export Tasks"
      description="Track the generation progress of your background reports and download completed files."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="text-xs text-muted-foreground font-medium">
            {jobs.length} total tasks
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2 text-xs flex items-center gap-1"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No export jobs</p>
            <p className="text-xs mt-1">
              Trigger background exports on large datasets from any report page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isRunning =
                job.job_status === "pending" || job.job_status === "processing";
              const isCompleted = job.job_status === "completed";
              const isFailed = job.job_status === "failed";

              return (
                <div
                  key={job.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getFormatIcon(job.format)}
                        <span className="text-sm font-semibold tracking-tight uppercase">
                          {job.report_key.replace(/-/g, " ")}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {job.format}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Job #{job.id} •{" "}
                        {new Date(
                          job.createdAt || Date.now(),
                        ).toLocaleTimeString()}
                        {job.row_count
                          ? ` • ${job.row_count.toLocaleString()} rows`
                          : ""}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        isCompleted
                          ? "active"
                          : isRunning
                            ? "pending"
                            : isFailed
                              ? "rejected"
                              : "neutral"
                      }
                      label={job.job_status.toUpperCase()}
                    />
                  </div>

                  {isRunning && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Generating...</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isFailed && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{job.error || "Export failed to process."}</span>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="pt-1 flex items-center justify-between">
                      {job.file_sha256 ? (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          SHA: {job.file_sha256.slice(0, 10)}...
                        </span>
                      ) : (
                        <span />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(job)}
                        className="h-7 text-xs flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}
