import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  SUPPORTED_COUNTRIES,
  validatePhoneNumber,
  formatAsYouType,
} from "../../../adapters/formatters";
import type { CountryCode } from "libphonenumber-js";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Input } from "../Input";
import { Button } from "../Button";

export interface PhoneFieldProps {
  value?: string;
  onChange?: (e164Value: string) => void;
  onBlur?: () => void;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  sizeVariant?: "sm" | "md" | "lg";
}

const SESSION_STORAGE_KEY = "hm_last_phone_country";

export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      defaultCountry = "IN",
      disabled = false,
      readOnly = false,
      placeholder = "Enter phone number",
      id,
      name,
      required,
      className,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
      sizeVariant = "md",
    },
    ref,
  ) => {
    // 1. Initial country from session storage or defaultCountry
    const initialCountry = useMemo(() => {
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored && SUPPORTED_COUNTRIES.some((c: any) => c.code === stored)) {
          return stored as CountryCode;
        }
      } catch {
        // Ignore session storage errors
      }
      return defaultCountry;
    }, [defaultCountry]);

    const [selectedCountry, setSelectedCountry] =
      useState<CountryCode>(initialCountry);
    const [inputValue, setInputValue] = useState("");
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const countryButtonRef = useRef<HTMLButtonElement>(null);

    // Current country info
    const currentCountryInfo = useMemo(() => {
      return (
        SUPPORTED_COUNTRIES.find((c: any) => c.code === selectedCountry) ||
        SUPPORTED_COUNTRIES[0]
      );
    }, [selectedCountry]);

    // Detect mobile viewport (< 640px)
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Sync input value from external prop
    useEffect(() => {
      if (!value) {
        setInputValue("");
        return;
      }
      const validation = validatePhoneNumber(value, selectedCountry);
      if (validation.valid && validation.country) {
        setSelectedCountry(validation.country);
        setInputValue(validation.formattedNational || value);
      } else {
        setInputValue(value);
      }
    }, [value, selectedCountry]);

    // Save selected country to sessionStorage
    const handleSelectCountry = (country: CountryCode) => {
      setSelectedCountry(country);
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, country);
      } catch {
        // Ignore storage errors
      }
      setSelectorOpen(false);
      setSearchQuery("");
      countryButtonRef.current?.focus();

      // Re-validate and format current input under new country
      if (inputValue) {
        const formatted = formatAsYouType(inputValue, country);
        setInputValue(formatted);
        const validation = validatePhoneNumber(formatted, country);
        onChange?.(
          validation.valid ? (validation.e164 ?? formatted) : formatted,
        );
      }
    };

    // Close on click outside or Esc
    useEffect(() => {
      if (!selectorOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setSelectorOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectorOpen(false);
          countryButtonRef.current?.focus();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [selectorOpen]);

    // Focus search input when popover opens
    useEffect(() => {
      if (selectorOpen) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [selectorOpen]);

    // Handle typing and formatting
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Handle paste with international dial code
      if (raw.startsWith("+")) {
        const val = validatePhoneNumber(raw);
        if (val.valid && val.country) {
          setSelectedCountry(val.country);
          setInputValue(val.formattedNational || raw);
          onChange?.(val.e164 || raw);
          return;
        }
      }

      const formatted = formatAsYouType(raw, selectedCountry);
      setInputValue(formatted);

      const validation = validatePhoneNumber(formatted, selectedCountry);
      onChange?.(validation.valid ? (validation.e164 ?? formatted) : formatted);
    };

    // Filtered countries
    const filteredCountries = useMemo(() => {
      if (!searchQuery.trim()) return SUPPORTED_COUNTRIES;
      const q = searchQuery.toLowerCase().trim();
      return SUPPORTED_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.dialCode.includes(q),
      );
    }, [searchQuery]);

    return (
      <div
        ref={containerRef}
        data-hm="phone"
        className={cn("relative flex w-full min-w-0 items-center", className)}
      >
        {/* Country Code Trigger Button */}
        <button
          ref={countryButtonRef}
          type="button"
          disabled={disabled || readOnly}
          onClick={() => setSelectorOpen((prev) => !prev)}
          aria-expanded={selectorOpen}
          aria-haspopup="dialog"
          aria-label={`${currentCountryInfo.code} ${currentCountryInfo.dialCode} ${currentCountryInfo.name}. Click to change country.`}
          className={cn(
            "flex h-10 min-h-[44px] items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-muted px-2.5 text-sm font-medium text-foreground transition-colors",
            "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
            readOnly && "cursor-default",
          )}
        >
          {/* Accessible Text ISO Badge */}
          <span
            className="flex h-5 w-6 items-center justify-center rounded border bg-card px-1 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            aria-hidden="true"
          >
            {currentCountryInfo.code}
          </span>
          <span className="text-xs text-foreground font-mono">
            {currentCountryInfo.dialCode}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              selectorOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {/* Phone Input Box */}
        <Input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={inputValue}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          sizeVariant={sizeVariant}
          data-hm="phone"
          onChange={handleInputChange}
          onBlur={onBlur}
          className={cn("rounded-l-none", className)}
        />

        {/* Country Selector Dropdown / Mobile Sheet */}
        {selectorOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select Country Code"
            className={cn(
              "z-50 bg-popover text-popover-foreground shadow-lg border border-border animate-in fade-in-0 zoom-in-95",
              isMobile
                ? "fixed inset-x-0 bottom-0 top-auto max-h-[80dvh] rounded-t-xl p-4 shadow-2xl"
                : "absolute left-0 top-[calc(100%+4px)] w-72 rounded-md p-2 max-h-80",
            )}
          >
            {/* Header in Mobile Sheet */}
            {isMobile && (
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-sm">Select Country</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSelectorOpen(false)}
                  aria-label="Close country selector"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Search Country Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search country or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs"
                data-hm="search"
              />
            </div>

            {/* Country List */}
            <div
              role="listbox"
              tabIndex={-1}
              className="max-h-56 overflow-y-auto space-y-0.5 divide-y divide-border/20"
            >
              {filteredCountries.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No matching countries
                </div>
              ) : (
                filteredCountries.map((c: any) => {
                  const isSelected = c.code === selectedCountry;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectCountry(c.code)}
                      className={cn(
                        "flex w-full min-h-[44px] items-center justify-between rounded px-2.5 py-1.5 text-xs text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none",
                        isSelected && "bg-accent/60 font-semibold text-primary",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-block w-6 font-mono text-[11px] text-muted-foreground font-semibold">
                          {c.code}
                        </span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-muted-foreground">
                          {c.dialCode}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

PhoneField.displayName = "PhoneField";
