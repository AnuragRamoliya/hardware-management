import React, { useState, useRef, useEffect, useId } from "react";
import { Clock, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface TimePickerProps {
  id?: string;
  name?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-hm"?: string;
  "aria-label"?: string;
}

export const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      disabled = false,
      placeholder = "Select time",
      className,
      "data-hm": dataHm = "time",
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const generatedId = useId();
    const pickerId = id || generatedId;
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Parse value (HH:mm) into 12-hour components
    const parsedTime = React.useMemo(() => {
      if (!value || typeof value !== "string") {
        return { hours24: 12, hours12: 12, minutes: 0, period: "PM" as const };
      }
      const parts = value.split(":");
      const h24 = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const period = h24 >= 12 ? ("PM" as const) : ("AM" as const);
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return { hours24: h24, hours12: h12, minutes: m, period };
    }, [value]);

    const displayText = React.useMemo(() => {
      if (!value) return "";
      const { hours12, minutes, period } = parsedTime;
      const hStr = String(hours12).padStart(2, "0");
      const mStr = String(minutes).padStart(2, "0");
      return `${hStr}:${mStr} ${period}`;
    }, [value, parsedTime]);

    // Outside click & escape handlers
    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node) &&
          (!popoverRef.current ||
            !popoverRef.current.contains(event.target as Node))
        ) {
          setOpen(false);
        }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    const updateTime = (h12: number, m: number, p: "AM" | "PM") => {
      let h24 = h12 % 12;
      if (p === "PM") h24 += 12;
      const hStr = String(h24).padStart(2, "0");
      const mStr = String(m).padStart(2, "0");
      onChange?.(`${hStr}:${mStr}`);
    };

    const handleHourChange = (delta: number) => {
      let nextH = parsedTime.hours12 + delta;
      if (nextH > 12) nextH = 1;
      if (nextH < 1) nextH = 12;
      updateTime(nextH, parsedTime.minutes, parsedTime.period);
    };

    const handleMinuteChange = (delta: number) => {
      let nextM = parsedTime.minutes + delta;
      if (nextM >= 60) nextM = 0;
      if (nextM < 0) nextM = 55;
      updateTime(parsedTime.hours12, nextM, parsedTime.period);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    };

    return (
      <div ref={containerRef} className="relative inline-block w-full">
        <button
          ref={ref}
          id={pickerId}
          name={name}
          type="button"
          disabled={disabled}
          data-hm={dataHm}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel || displayText || placeholder}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !displayText && "text-muted-foreground",
            displayText && "text-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Clock className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
            <span className="truncate">{displayText || placeholder}</span>
          </span>

          <span className="flex items-center gap-1">
            {displayText && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear time"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange?.("");
                  }
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
        </button>

        {open && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose time"
            className="absolute left-0 top-full mt-1.5 z-50 bg-card p-3 shadow-lg border border-border rounded-lg text-card-foreground w-64 animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
              <span className="text-xs font-semibold">Select Time</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Steppers */}
            <div className="flex items-center justify-center gap-3 py-2">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  aria-label="Increment hours"
                  onClick={() => handleHourChange(1)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold w-10 text-center select-none py-1">
                  {String(parsedTime.hours12).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  aria-label="Decrement hours"
                  onClick={() => handleHourChange(-1)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground mt-1">
                  HR
                </span>
              </div>

              <span className="text-lg font-bold text-muted-foreground pb-4">
                :
              </span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  aria-label="Increment minutes"
                  onClick={() => handleMinuteChange(5)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold w-10 text-center select-none py-1">
                  {String(parsedTime.minutes).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  aria-label="Decrement minutes"
                  onClick={() => handleMinuteChange(-5)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground mt-1">
                  MIN
                </span>
              </div>

              {/* AM / PM Toggle */}
              <div className="flex flex-col gap-1 pb-4 ml-1">
                <button
                  type="button"
                  onClick={() =>
                    updateTime(parsedTime.hours12, parsedTime.minutes, "AM")
                  }
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
                    parsedTime.period === "AM"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateTime(parsedTime.hours12, parsedTime.minutes, "PM")
                  }
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
                    parsedTime.period === "PM"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const h = now.getHours();
                  const m = now.getMinutes();
                  const p = h >= 12 ? "PM" : "AM";
                  let h12 = h % 12;
                  if (h12 === 0) h12 = 12;
                  updateTime(h12, m, p);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

TimePicker.displayName = "TimePicker";
