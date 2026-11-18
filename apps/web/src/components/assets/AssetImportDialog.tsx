import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { importAssetsApi, type AssetImportResult } from "@/api/assets";
import { assetKeys } from "@/hooks/queries/assets";
import { endPoints } from "@/api/endpoint";

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetImportDialog({
  open,
  onOpenChange,
}: AssetImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AssetImportResult | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const response = await importAssetsApi(selectedFile);
      if (!response.ok || !response.data)
        throw new Error(response.message || "Import failed");
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data);
      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} assets`);
        void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      }
      if (data.errors.length > 0) {
        toast.warning(`Import completed with ${data.errors.length} row errors`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = `${import.meta.env.VITE_HOST_API ?? ""}${endPoints.asset.importTemplate}`;
    link.setAttribute("download", "assets_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setFile(null);
    setReport(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Import hardware assets</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Bulk-upload inventory from a CSV or XLSX spreadsheet. Download our
          pre-formatted template to ensure valid column names.
        </p>

        <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
          <div>
            <p className="text-sm font-medium">CSV Import Template</p>
            <p className="text-xs text-muted-foreground">
              Standard headers for category, vendor, location, brand, model, and
              serial number.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleDownloadTemplate}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download template
          </Button>
        </div>

        {!report ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-3">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {file ? file.name : "Choose CSV or XLSX file"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "Max file size: 10MB"}
                </p>
              </div>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  className="sr-only"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) setFile(selected);
                  }}
                />
                <span className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-xs font-medium shadow-sm hover:bg-muted">
                  Select file from computer
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!file || importMutation.isPending}
                loading={importMutation.isPending}
                onClick={() => file && importMutation.mutate(file)}
              >
                Upload and import
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>{report.imported} items successfully imported</span>
              </div>
              {report.errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {report.errors.length} rows rejected due to validation
                    errors
                  </span>
                </div>
              )}
            </Card>

            {report.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-md">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/50 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.map((err, i) => (
                      <tr key={i} className="border-b last:border-none">
                        <td className="py-1.5 px-3 font-mono">{err.row}</td>
                        <td className="py-1.5 px-3 text-danger">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end border-t pt-3">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
