import React, { useState } from "react";
import { formatPhoneNumber, validatePhoneNumber } from "@hm/shared";
import { Phone, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhoneDisplayProps {
  value?: string | null;
  mode?: "international" | "national" | "e164";
  showIcon?: boolean;
  allowCopy?: boolean;
  className?: string;
}

export function PhoneDisplay({
  value,
  mode = "international",
  showIcon = false,
  allowCopy = true,
  className,
}: PhoneDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const formatted = formatPhoneNumber(value, mode);
  const validation = validatePhoneNumber(value);
  const telLink = validation.valid ? `tel:${validation.e164}` : `tel:${value}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(validation.e164 || value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write errors
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm text-foreground",
        className,
      )}
    >
      {showIcon && (
        <Phone
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <a
        href={telLink}
        className="hover:underline hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        aria-label={`Call ${formatted}`}
      >
        {formatted}
      </a>
      {allowCopy && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Phone number copied" : "Copy phone number"}
          className="inline-flex h-6 w-6 min-h-[24px] min-w-[24px] items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}
    </span>
  );
}
