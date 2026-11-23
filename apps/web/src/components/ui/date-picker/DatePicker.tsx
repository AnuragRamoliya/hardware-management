import React, { useState, useRef, useEffect, useId } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseDateString,
  formatDateString,
  formatDateDisplay,
} from "./date-utils";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string | Date | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-hm"?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  "aria-label"?: string;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      disabled = false,
      placeholder = "Select date",
      className,
      "data-hm": dataHm = "date",
      minDate,
      maxDate,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const generatedId = useId();
    const pickerId = id || generatedId;
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Parse value to Date
    const selectedDate = React.useMemo(() => {
      if (!value) return undefined;
      return typeof value === "string" ? parseDateString(value) : value;
    }, [value]);

    const min = React.useMemo(() => {
      if (!minDate) return undefined;
      return typeof minDate === "string" ? parseDateString(minDate) : minDate;
    }, [minDate]);

    const max = React.useMemo(() => {
      if (!maxDate) return undefined;
      return typeof maxDate === "string" ? parseDateString(maxDate) : maxDate;
    }, [maxDate]);

    // Detect mobile viewport (<= 640px)
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 640);
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

    const handleSelect = (date: Date | undefined) => {
      if (!date) {
        onChange?.("");
      } else {
        onChange?.(formatDateString(date));
      }
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    };

    const displayText = selectedDate ? formatDateDisplay(selectedDate) : "";

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
                aria-label="Clear date"
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
          <>
            {/* Mobile Sheet Backdrop */}
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
              aria-label="Choose date"
              className={cn(
                "z-50 bg-card p-3 shadow-lg border border-border rounded-lg text-card-foreground",
                isMobile
                  ? "fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-xl rounded-b-none p-4 animate-in slide-in-from-bottom"
                  : "absolute left-0 top-full mt-1.5 w-auto animate-in fade-in-0 zoom-in-95",
              )}
            >
              {isMobile && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="text-sm font-semibold">Select Date</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-border text-xs">
                <button
                  type="button"
                  onClick={() => handleSelect(new Date())}
                  className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    handleSelect(y);
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Yesterday
                </button>
                {displayText && (
                  <button
                    type="button"
                    onClick={() => handleSelect(undefined)}
                    className="ml-auto rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* DayPicker */}
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelect}
                  disabled={[
                    ...(min ? [{ before: min }] : []),
                    ...(max ? [{ after: max }] : []),
                  ]}
                  classNames={{
                    root: "p-0",
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
                    selected:
                      "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground rounded-md",
                    today:
                      "font-bold text-primary underline underline-offset-4",
                    outside: "text-muted-foreground opacity-30",
                    disabled:
                      "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
