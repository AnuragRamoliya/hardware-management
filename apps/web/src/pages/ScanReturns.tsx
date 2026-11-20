import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Laptop,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { offboardingApi } from "@/api/offboarding";
import { playChime } from "@/lib/realtime";
import { PATHS } from "@/routes/paths";

interface ScannedItem {
  id: string;
  tag: string;
  assetName: string;
  employeeName: string;
  caseId: number;
  remainingTasks: number;
  timestamp: string;
}

export function ScanReturns() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    tag: string;
    message: string;
    assetName?: string;
    employeeName?: string;
    caseId?: number;
    remainingTasks?: number;
  } | null>(null);

  const [sessionHistory, setSessionHistory] = useState<ScannedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = barcodeInput.trim();
    if (!tag || isProcessing) return;

    setIsProcessing(true);
    setBarcodeInput("");

    try {
      const res = await offboardingApi.receiveByTag({
        asset_tag: tag,
        condition: "good",
        notes: "Scanned at IT return desk",
      });

      if (!res.ok) {
        throw new Error(
          res.message || `No active return task found for tag "${tag}"`,
        );
      }

      if (soundEnabled) playChime("success");

      const item: ScannedItem = {
        id: `${tag}-${Date.now()}`,
        tag,
        assetName: res.data?.asset?.asset_name || "Hardware Asset",
        employeeName: res.data?.case?.employee_name || "Employee",
        caseId: res.data?.case?.id || 0,
        remainingTasks: res.data?.case?.remaining_tasks ?? 0,
        timestamp: new Date().toLocaleTimeString(),
      };

      setLastScanResult({
        success: true,
        tag,
        message: "Asset checked in successfully",
        assetName: item.assetName,
        employeeName: item.employeeName,
        caseId: item.caseId,
        remainingTasks: item.remainingTasks,
      });

      setSessionHistory((prev) => [item, ...prev]);
    } catch (err: unknown) {
      if (soundEnabled) playChime("error");
      const errorMsg =
        err instanceof Error ? err.message : "Error checking in asset";
      setLastScanResult({
        success: false,
        tag,
        message: errorMsg,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hardware Return Scanner"
        description="Rapid handheld barcode check-in station for walk-up hardware returns."
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Offboarding Cases", to: PATHS.OFFBOARDING_CASES },
          { label: "Scan Returns" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              className="gap-2"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-primary" />
                  Sound: On
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                  Sound: Off
                </>
              )}
            </Button>
            <Link to={PATHS.OFFBOARDING_CASES}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Cases
              </Button>
            </Link>
          </div>
        }
      />

      {/* Barcode Wedge Scanner Input */}
      <Card className="p-6">
        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Scan Barcode / Enter Asset Tag
            </h3>
          </div>
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode with handheld scanner or enter asset tag..."
              className="font-mono text-base tracking-wide"
              disabled={isProcessing}
              autoFocus
            />
            <Button
              type="submit"
              disabled={isProcessing || !barcodeInput.trim()}
            >
              {isProcessing ? "Processing..." : "Check In"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keyboard-wedge barcode readers fire an automatic Enter key. The
            input remains focused after each scan for continuous processing.
          </p>
        </form>
      </Card>

      {/* Instant Result Card */}
      {lastScanResult && (
        <Card
          className={`border-2 p-6 transition-all ${
            lastScanResult.success
              ? "border-success/50 bg-success/5"
              : "border-destructive/50 bg-destructive/5"
          }`}
        >
          <div className="flex items-start gap-4">
            {lastScanResult.success ? (
              <CheckCircle2 className="h-8 w-8 text-success" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h4
                  className={`text-lg font-bold ${
                    lastScanResult.success ? "text-success" : "text-destructive"
                  }`}
                >
                  {lastScanResult.success
                    ? "Asset Returned"
                    : "Check-in Failed"}
                </h4>
                <Badge variant="outline" className="font-mono text-xs">
                  {lastScanResult.tag}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">
                {lastScanResult.message}
              </p>

              {lastScanResult.success && (
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border bg-background/80 p-3 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Asset:
                    </span>
                    <div className="text-sm font-medium">
                      {lastScanResult.assetName}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Employee:
                    </span>
                    <div className="text-sm font-medium">
                      {lastScanResult.employeeName}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Remaining Tasks:
                    </span>
                    <div className="text-sm font-medium">
                      {lastScanResult.remainingTasks} pending
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Session History Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Session Return History
            </h3>
          </div>
          <Badge variant="outline">{sessionHistory.length} checked in</Badge>
        </div>
        <div className="divide-y">
          {sessionHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No assets scanned during this session.
            </div>
          ) : (
            sessionHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">
                      {item.tag}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm font-medium text-foreground">
                      {item.assetName}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Returned by: {item.employeeName} • Case #{item.caseId} •{" "}
                    {item.remainingTasks} tasks left
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {item.timestamp}
                  </span>
                  <Badge variant="success" className="text-xs">
                    Returned
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
