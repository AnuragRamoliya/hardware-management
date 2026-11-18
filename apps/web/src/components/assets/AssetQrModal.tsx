import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/common/States";
import { Printer } from "lucide-react";
import { useAssetQrCode } from "@/hooks/queries/assets";
import type { AssetRecord } from "@/api/assets";

interface AssetQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetRecord | null;
}

export function AssetQrModal({ open, onOpenChange, asset }: AssetQrModalProps) {
  const qrQuery = useAssetQrCode(asset?.id ?? "", open && Boolean(asset?.id));

  if (!asset) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${asset.asset_tag} — QR Label</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .label { border: 2px solid #000; padding: 20px; text-align: center; border-radius: 8px; width: 260px; }
            img { width: 180px; height: 180px; }
            h2 { margin: 8px 0 4px; font-size: 20px; }
            p { margin: 2px 0; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrQuery.data?.qr ?? ""}" alt="${asset.asset_tag}" />
            <h2>${asset.asset_tag}</h2>
            <p>${[asset.brand, asset.model].filter(Boolean).join(" ")}</p>
            ${asset.serial_no ? `<p>SN: ${asset.serial_no}</p>` : ""}
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogTitle className="text-center">{asset.asset_tag}</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Scan this QR tag to quickly view hardware specs or verify physical
          inventory.
        </p>

        <div className="flex flex-col items-center justify-center p-4">
          {qrQuery.isLoading ? (
            <div className="h-48 w-48 flex items-center justify-center">
              <Spinner label="Generating QR code" />
            </div>
          ) : qrQuery.error ? (
            <p className="text-xs text-danger">{qrQuery.error.message}</p>
          ) : qrQuery.data?.qr ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <img
                src={qrQuery.data.qr}
                alt={`QR Code for ${asset.asset_tag}`}
                className="h-48 w-48 object-contain"
              />
            </div>
          ) : null}

          <div className="mt-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {[asset.brand, asset.model].filter(Boolean).join(" ")}
            </p>
            {asset.serial_no && <p>Serial: {asset.serial_no}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={!qrQuery.data?.qr}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
