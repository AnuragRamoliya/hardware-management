import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { calculatePasswordStrength } from "@/utils/password";

export interface PasswordStrengthMeterProps {
  password?: string;
  minLength?: number;
  requireComplexity?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password = "",
  minLength = 12,
  requireComplexity = true,
  className,
}: PasswordStrengthMeterProps) {
  const result = useMemo(
    () => calculatePasswordStrength(password, minLength, requireComplexity),
    [password, minLength, requireComplexity],
  );

  return (
    <div
      className={cn("mt-2 space-y-1.5", className)}
      aria-label={`Password strength: ${result.label}`}
    >
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={result.score}
        aria-valuemin={0}
        aria-valuemax={4}
      >
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-200",
              result.score >= level ? result.barColor : "bg-muted",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Strength:{" "}
          <strong className={cn("font-semibold", result.textColor)}>
            {result.label}
          </strong>
        </span>
        <span>
          {minLength}+ chars {requireComplexity ? "& mixed symbols" : ""}
        </span>
      </div>
    </div>
  );
}
