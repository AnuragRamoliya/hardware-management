import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Search, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  offboardingApi,
  type DocumentVerificationResult,
} from "@/api/offboarding";

export function VerifyDocument() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DocumentVerificationResult | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await offboardingApi.verifyDocument(trimmed);
      if (res.ok && res.data) {
        setResult(res.data);
      } else {
        setResult({
          verified: false,
          code: trimmed,
          message: res.message || "Document verification failed. Invalid code.",
        });
      }
    } catch (err: unknown) {
      setResult({
        verified: false,
        code: trimmed,
        message:
          err instanceof Error
            ? err.message
            : "Could not contact document verification registry.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("code")) {
      void handleVerify();
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <FileCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Clearance Certificate Verification
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the unique verification code printed on the official IT Asset
          Management Clearance Certificate.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CLR-2026-0012-A1B2C3"
              className="font-mono uppercase text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Codes follow the format <code>CLR-[YEAR]-[CASE_ID]-[HASH]</code> and
            are cryptographically verified against the audit ledger.
          </p>
        </form>
      </Card>

      {result && (
        <Card
          className={`border-2 p-6 transition-all ${
            result.verified
              ? "border-success/50 bg-success/5"
              : "border-destructive/50 bg-destructive/5"
          }`}
        >
          <div className="flex items-start gap-4">
            {result.verified ? (
              <ShieldCheck className="h-8 w-8 text-success" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-destructive" />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3
                  className={`text-lg font-bold ${
                    result.verified ? "text-success" : "text-destructive"
                  }`}
                >
                  {result.verified
                    ? "Authentic Certificate Verified"
                    : "Certificate Verification Failed"}
                </h3>
                <Badge
                  variant={result.verified ? "success" : "danger"}
                  className="text-xs"
                >
                  {result.verified ? "Verified" : "Invalid"}
                </Badge>
              </div>

              {result.verified ? (
                <div className="mt-4 space-y-3 rounded-lg border bg-background/80 p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Employee:
                      </span>
                      <div className="font-semibold text-foreground">
                        {result.employee_name || "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Employee ID:
                      </span>
                      <div className="font-mono font-medium text-foreground">
                        {result.employee_code || `EMP-${result.case_id}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Last Working Day:
                      </span>
                      <div className="font-medium text-foreground">
                        {result.last_working_day || "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Clearance Issued At:
                      </span>
                      <div className="font-medium text-foreground">
                        {result.completed_at
                          ? new Date(result.completed_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {result.hash && (
                    <div className="border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        Tamper-Evident SHA-256 Digest:
                      </span>
                      <div className="break-all font-mono text-[11px] text-muted-foreground">
                        {result.hash}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive">
                  {result.message ||
                    "This verification code does not match any authenticated clearance certificate in the registry."}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
