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
          valid: false,
          case_no: null,
          issued_at: null,
          message: res.message || "Document verification failed. Invalid code.",
        });
      }
    } catch (err: unknown) {
      setResult({
        valid: false,
        case_no: null,
        issued_at: null,
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
    const codeParam = searchParams.get("code");
    if (!codeParam) return;
    setCode(codeParam);
    let cancelled = false;
    setIsLoading(true);
    setResult(null);
    offboardingApi
      .verifyDocument(codeParam.trim())
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setResult(res.data);
        } else {
          setResult({
            valid: false,
            case_no: null,
            issued_at: null,
            message:
              res.message || "Document verification failed. Invalid code.",
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          valid: false,
          case_no: null,
          issued_at: null,
          message:
            err instanceof Error
              ? err.message
              : "Could not contact document verification registry.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 py-6">
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
              aria-label="Clearance certificate verification code"
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
            (result.valid ?? result.verified)
              ? "border-success/50 bg-success/5"
              : "border-destructive/50 bg-destructive/5"
          }`}
        >
          <div className="flex items-start gap-4">
            {(result.valid ?? result.verified) ? (
              <ShieldCheck className="h-8 w-8 text-success" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-destructive" />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3
                  className={`text-lg font-bold ${
                    (result.valid ?? result.verified)
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {(result.valid ?? result.verified)
                    ? "Authentic Certificate Verified"
                    : "Certificate Verification Failed"}
                </h3>
                <Badge
                  variant={
                    (result.valid ?? result.verified) ? "success" : "danger"
                  }
                  className="text-xs"
                >
                  {(result.valid ?? result.verified) ? "Verified" : "Invalid"}
                </Badge>
              </div>

              {(result.valid ?? result.verified) ? (
                <div className="mt-4 space-y-3 rounded-lg border bg-background/80 p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Case Number:
                      </span>
                      <div className="font-semibold text-foreground">
                        {result.case_no || "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Clearance Issued At:
                      </span>
                      <div className="font-medium text-foreground">
                        {result.issued_at
                          ? new Date(result.issued_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>
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
    </main>
  );
}
