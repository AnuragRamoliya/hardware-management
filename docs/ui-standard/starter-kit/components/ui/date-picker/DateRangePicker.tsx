import React, { useState, useRef, useEffect, useId } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  parseDateString,
  formatDateString,
  formatDateRangeDisplay,
  DATE_PRESETS,
} from "./date-utils";

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface DateRangePickerProps {
  id?: string;
  name?: string;
  value?: DateRangeValue | null;
  onChange?: (value: DateRangeValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-hm"?: string;
  "aria-label"?: string;
  numberOfMonths?: number;
}

export const DateRangePicker = React.forwardRef<
  HTMLButtonElement,
  DateRangePickerProps
>(
  (
    {
      id,
      name,
      value,
      onChange,
      disabled = false,
      placeholder = "Select date range",
      className,
      "data-hm": dataHm = "date-range",
      "aria-label": ariaLabel,
      numberOfMonths: propMonths,
    },
    ref,
  ) => {
    const generatedId = useId();
    const pickerId = id || generatedId;
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Parse value to DateRange for react-day-picker
    const selectedRange = React.useMemo<DateRange | undefined>(() => {
      if (!value) return undefined;
      const from = value.from ? parseDateString(value.from) : undefined;
      const to = value.to ? parseDateString(value.to) : undefined;
      if (!from && !to) return undefined;
      return { from, to };
    }, [value]);

    // Detect mobile viewport (<= 768px)
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

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

    const handleSelect = (range: DateRange | undefined) => {
      if (!range) {
        onChange?.({ from: "", to: "" });
      } else {
        const from = range.from ? formatDateString(range.from) : "";
        const to = range.to ? formatDateString(range.to) : "";
        onChange?.({ from, to });
        // Close if both from and to are selected and different, or user completed range
        if (range.from && range.to) {
          setOpen(false);
        }
      }
    };

    const handleApplyPreset = (presetId: string) => {
      const preset = DATE_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        const r = preset.getRange();
        onChange?.(r);
        setOpen(false);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.({ from: "", to: "" });
    };

    const displayText = formatDateRangeDisplay(value);

    // Determine number of months
    const monthsToDisplay = propMonths ?? (isMobile ? 1 : 2);

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
            <CalendarIcon
              className="h-4 w-4 shrink-0 opacity-60"
              aria-hidden="true"
            />
            <span className="truncate">{displayText || placeholder}</span>
          </span>

          <span className="flex items-center gap-1">
            {displayText && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date range"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange?.({ from: "", to: "" });
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
          <>
            {/* Mobile Backdrop */}
            {isMobile && (
              <div
                className="fixed inset-0 z-50 bg-black/50 transition-opacity"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Popover / Mobile Sheet Content */}
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label="Choose date range"
              className={cn(
                "z-50 bg-card p-3 shadow-lg border border-border rounded-lg text-card-foreground flex flex-col md:flex-row gap-3",
                isMobile
                  ? "fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-xl rounded-b-none p-4 animate-in slide-in-from-bottom"
                  : "absolute left-0 top-full mt-1.5 w-auto animate-in fade-in-0 zoom-in-95",
              )}
            >
              {isMobile && (
                <div className="flex items-center justify-between pb-2 border-b border-border w-full md:hidden">
                  <span className="text-sm font-semibold">
                    Select Date Range
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Presets Sidebar */}
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 md:pr-3 md:border-r border-border border-b md:border-b-0 shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 hidden md:block">
                  Presets
                </span>
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="whitespace-nowrap text-left px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* DayPicker */}
              <div className="flex flex-col">
                <DayPicker
                  mode="range"
                  numberOfMonths={monthsToDisplay}
                  selected={selectedRange}
                  onSelect={handleSelect}
                  classNames={{
                    root: "p-0",
                    months: "flex flex-col sm:flex-row gap-4",
                    month_caption:
                      "flex justify-center items-center h-8 font-semibold text-sm",
                    nav: "flex items-center justify-between absolute w-full left-0 px-2",
                    button_previous:
                      "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-foreground",
                    button_next:
                      "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-foreground",
                    month_grid: "w-full border-collapse space-y-1 mt-2",
                    weekdays: "flex",
                    weekday:
                      "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center",
                    week: "flex w-full mt-1",
                    day: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day_button:
                      "h-8 w-8 p-0 font-normal rounded-md hover:bg-muted transition-colors flex items-center justify-center text-foreground",
                    range_start:
                      "bg-primary text-primary-foreground font-semibold rounded-l-md hover:bg-primary hover:text-primary-foreground",
                    range_end:
                      "bg-primary text-primary-foreground font-semibold rounded-r-md hover:bg-primary hover:text-primary-foreground",
                    range_middle:
                      "bg-primary/15 text-foreground rounded-none hover:bg-primary/20",
                    today:
                      "font-bold text-primary underline underline-offset-4",
                    outside: "text-muted-foreground opacity-30",
                    disabled:
                      "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                  }}
                />

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-xs">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {displayText || "No range selected"}
                  </span>
                  <div className="flex gap-2">
                    {displayText && (
                      <button
                        type="button"
                        onClick={() => handleSelect(undefined)}
                        className="rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);

DateRangePicker.displayName = "DateRangePicker";
