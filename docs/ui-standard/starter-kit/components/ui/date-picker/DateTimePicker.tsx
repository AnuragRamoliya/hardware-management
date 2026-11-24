import React, { useState, useRef, useEffect, useId } from "react";
import { DayPicker } from "react-day-picker";
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { parseDateString, formatDateDisplay } from "./date-utils";

export interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string | Date | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-hm"?: string;
  "aria-label"?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
}

export const DateTimePicker = React.forwardRef<
  HTMLButtonElement,
  DateTimePickerProps
>(
  (
    {
      id,
      name,
      value,
      onChange,
      disabled = false,
      placeholder = "Select date & time",
      className,
      "data-hm": dataHm = "datetime",
      "aria-label": ariaLabel,
      minDate,
      maxDate,
    },
    ref,
  ) => {
    const generatedId = useId();
    const pickerId = id || generatedId;
    const [open, setOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Parse value into Date and Time components
    const { selectedDate, hours12, minutes, period } = React.useMemo(() => {
      if (!value) {
        return {
          selectedDate: undefined,
          hours12: 12,
          minutes: 0,
          period: "PM" as const,
        };
      }
      let d: Date | undefined;
      if (typeof value === "string") {
        d = parseDateString(value);
      } else if (value instanceof Date) {
        d = value;
      }
      if (!d || Number.isNaN(d.getTime())) {
        return {
          selectedDate: undefined,
          hours12: 12,
          minutes: 0,
          period: "PM" as const,
        };
      }

      const h24 = d.getHours();
      const m = d.getMinutes();
      const p = h24 >= 12 ? ("PM" as const) : ("AM" as const);
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;

      return {
        selectedDate: d,
        hours12: h12,
        minutes: m,
        period: p,
      };
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

    const composeAndEmit = (
      date: Date | undefined,
      h12: number,
      m: number,
      p: "AM" | "PM",
    ) => {
      if (!date) {
        onChange?.("");
        return;
      }
      let h24 = h12 % 12;
      if (p === "PM") h24 += 12;

      const y = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const hStr = String(h24).padStart(2, "0");
      const mStr = String(m).padStart(2, "0");

      onChange?.(`${y}-${month}-${d}T${hStr}:${mStr}:00`);
    };

    const handleSelectDate = (date: Date | undefined) => {
      if (!date) {
        onChange?.("");
      } else {
        composeAndEmit(date, hours12, minutes, period);
      }
    };

    const handleHourChange = (delta: number) => {
      const baseDate = selectedDate || new Date();
      let nextH = hours12 + delta;
      if (nextH > 12) nextH = 1;
      if (nextH < 1) nextH = 12;
      composeAndEmit(baseDate, nextH, minutes, period);
    };

    const handleMinuteChange = (delta: number) => {
      const baseDate = selectedDate || new Date();
      let nextM = minutes + delta;
      if (nextM >= 60) nextM = 0;
      if (nextM < 0) nextM = 55;
      composeAndEmit(baseDate, hours12, nextM, period);
    };

    const togglePeriod = (nextP: "AM" | "PM") => {
      const baseDate = selectedDate || new Date();
      composeAndEmit(baseDate, hours12, minutes, nextP);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
    };

    const displayText = React.useMemo(() => {
      if (!selectedDate) return "";
      const dateStr = formatDateDisplay(selectedDate);
      const hStr = String(hours12).padStart(2, "0");
      const mStr = String(minutes).padStart(2, "0");
      return `${dateStr}, ${hStr}:${mStr} ${period}`;
    }, [selectedDate, hours12, minutes, period]);

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
                aria-label="Clear date and time"
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
            {isMobile && (
              <div
                className="fixed inset-0 z-50 bg-black/50 transition-opacity"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
            )}

            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label="Choose date and time"
              className={cn(
                "z-50 bg-card p-3 shadow-lg border border-border rounded-lg text-card-foreground flex flex-col gap-3",
                isMobile
                  ? "fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-xl rounded-b-none p-4 animate-in slide-in-from-bottom"
                  : "absolute left-0 top-full mt-1.5 w-auto animate-in fade-in-0 zoom-in-95",
              )}
            >
              {isMobile && (
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-sm font-semibold">
                    Select Date & Time
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

              {/* DayPicker */}
              <div className="flex justify-center border-b border-border pb-2">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelectDate}
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

              {/* Time Steppers */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Time:</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Hours */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Decrease hours"
                      onClick={() => handleHourChange(-1)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center select-none">
                      {String(hours12).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase hours"
                      onClick={() => handleHourChange(1)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span>:</span>

                  {/* Minutes */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Decrease minutes"
                      onClick={() => handleMinuteChange(-5)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center select-none">
                      {String(minutes).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase minutes"
                      onClick={() => handleMinuteChange(5)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* AM/PM */}
                  <div className="flex gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => togglePeriod("AM")}
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-semibold rounded",
                        period === "AM"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePeriod("PM")}
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-semibold rounded",
                        period === "PM"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {displayText || "No date selected"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";
