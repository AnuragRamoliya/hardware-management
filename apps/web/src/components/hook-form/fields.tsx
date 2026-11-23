import { Controller, useFormContext, useWatch } from "react-hook-form";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Search,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Radio } from "@/components/ui/radio";
import { RHFPhoneField } from "./RHFPhoneField";
import { RHFDatePicker } from "./RHFDatePicker";
import { RHFDateRangePicker } from "./RHFDateRangePicker";
import { RHFTimePicker } from "./RHFTimePicker";
import { RHFDateTimePicker } from "./RHFDateTimePicker";

export {
  RHFPhoneField,
  RHFDatePicker,
  RHFDateRangePicker,
  RHFTimePicker,
  RHFDateTimePicker,
};
import { useDebounce } from "@/hooks/use-debounce";
import { useAsyncOptions } from "@/hooks/use-async-options";
import type { OptionItem } from "@/types/select";
import { PasswordStrengthMeter } from "@/components/common/PasswordStrengthMeter";
import { generateSecureRandomPassword } from "@/utils/password";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FieldProps {
  name: string;
  label: string;
  helperText?: string;
  required?: boolean;
  leading?: ReactNode;
}

function FieldShell({
  name,
  label,
  required,
  helperText,
  children,
}: FieldProps & { children: ReactNode }) {
  const { getFieldState, formState } = useFormContext();
  const error = getFieldState(name, formState).error;
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={name} className="block text-[13px] font-medium">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${name}-error`}
          aria-live="polite"
          className="flex items-center gap-1 text-xs text-danger"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error.message}
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

export function RHFTextField({
  name,
  label,
  required,
  helperText,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];
  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      helperText={helperText}
    >
      <Input
        id={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
        {...register(name, {
          required: required ? `${label} is required` : false,
        })}
      />
    </FieldShell>
  );
}

export type RHFPasswordFieldProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
    strengthMeter?: boolean;
    showStrengthMeter?: boolean;
    showGenerator?: boolean;
    showCopy?: boolean;
    policy?: {
      minLength?: number;
      requireComplexity?: boolean;
    };
    onGenerate?: (password: string) => void;
  };

export function RHFPasswordField(props: RHFPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { register, formState, watch, setValue } = useFormContext();
  const error = formState.errors[props.name];
  const {
    name,
    label,
    required,
    helperText,
    strengthMeter,
    showStrengthMeter,
    showGenerator,
    showCopy,
    policy,
    onGenerate,
    className,
    ...inputProps
  } = props;

  const password = String(watch(name) ?? "");
  const enableStrength = strengthMeter || showStrengthMeter;

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleGenerate = () => {
    const minLength = policy?.minLength || 16;
    const requireComplexity = policy?.requireComplexity ?? true;
    const generated = generateSecureRandomPassword(
      minLength,
      requireComplexity,
    );
    setValue(name, generated, { shouldDirty: true, shouldValidate: true });
    setVisible(true);
    if (onGenerate) onGenerate(generated);
  };

  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      helperText={helperText}
    >
      <div className="relative">
        <Input
          id={name}
          type={visible ? "text" : "password"}
          className={`pr-28 font-mono text-sm ${className || ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...inputProps}
          {...register(name, {
            required: required ? `${label} is required` : false,
          })}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showCopy && password.length > 0 && (
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy password"}
              title="Copy password"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
          {showGenerator && (
            <button
              type="button"
              aria-label="Generate strong password"
              title="Generate strong password"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={handleGenerate}
            >
              <KeyRound className="h-4 w-4 text-primary" />
            </button>
          )}
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            title={visible ? "Hide password" : "Show password"}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {enableStrength && (
        <PasswordStrengthMeter
          password={password}
          minLength={policy?.minLength || 12}
          requireComplexity={policy?.requireComplexity ?? true}
        />
      )}
    </FieldShell>
  );
}

export function RHFTextArea({
  name,
  label,
  required,
  helperText,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { register, formState } = useFormContext();
  const value = useFormContext().watch(name);
  const error = formState.errors[name];
  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      helperText={helperText}
    >
      <Textarea
        id={name}
        aria-invalid={Boolean(error)}
        {...props}
        {...register(name, {
          required: required ? `${label} is required` : false,
        })}
        onInput={(event) => {
          event.currentTarget.style.height = "auto";
          event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
        }}
      />
      {props.maxLength && (
        <p
          aria-live="polite"
          className="text-right text-[11px] text-muted-foreground"
        >
          {String(value ?? "").length}/{props.maxLength}
        </p>
      )}
    </FieldShell>
  );
}

export function RHFNumberField({
  name,
  label,
  required,
  helperText,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <RHFTextField
      name={name}
      label={label}
      required={required}
      helperText={helperText}
      type="number"
      inputMode="decimal"
      {...props}
    />
  );
}

export function RHFSelect({
  name,
  label,
  required,
  helperText,
  options,
  clearable = false,
}: FieldProps & {
  options: Array<{ value: string; label: string }>;
  clearable?: boolean;
}) {
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);
  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      helperText={helperText}
    >
      <Controller
        control={control}
        name={name}
        rules={{ required: required ? `${label} is required` : false }}
        render={({ field, fieldState }) => (
          <div className="relative">
            <Select
              open={open}
              onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) setSearch("");
              }}
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                id={name}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? `${name}-error` : undefined
                }
              >
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div className="sticky top-0 z-[50] bg-popover p-2">
                  <Input
                    ref={searchRef}
                    aria-label={`Search ${label}`}
                    placeholder={`Search ${label.toLowerCase()}…`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(event) => {
                      if (
                        ![
                          "ArrowDown",
                          "ArrowUp",
                          "Home",
                          "End",
                          "PageUp",
                          "PageDown",
                        ].includes(event.key)
                      ) {
                        event.stopPropagation();
                      }
                    }}
                  />
                </div>
                {options
                  .filter((option) =>
                    option.label
                      .toLowerCase()
                      .includes(search.trim().toLowerCase()),
                  )
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                {options.filter((option) =>
                  option.label
                    .toLowerCase()
                    .includes(search.trim().toLowerCase()),
                ).length === 0 && (
                  <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                    No options found
                  </p>
                )}
              </SelectContent>
            </Select>
            {clearable && field.value && (
              <button
                type="button"
                className="absolute right-9 top-1/2 z-50 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                aria-label={`Clear ${label}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => field.onChange("")}
              >
                ×
              </button>
            )}
          </div>
        )}
      />
    </FieldShell>
  );
}

export function RHFAsyncSelect({
  name,
  label,
  endpoint,
  required,
  helperText,
  filters,
  clearable = false,
}: FieldProps & {
  endpoint: string;
  filters?: Record<string, unknown>;
  clearable?: boolean;
}) {
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadingMoreRef = useRef(false);
  const optionsQuery = useAsyncOptions({
    endpoint,
    filters,
    enabled: open,
  });
  const watchedValue = useWatch({ control, name });
  const selectedValue = watchedValue == null ? "" : String(watchedValue);
  const optionRows = optionsQuery.data?.rows;
  const selectedOptions = optionsQuery.selectedOptions;
  const hydrateIds = optionsQuery.hydrateIds;
  const optionsLoading = optionsQuery.isLoading;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const isLoaded =
      optionRows?.some((option) => String(option.value) === selectedValue) ||
      selectedOptions.has(selectedValue);
    if (selectedValue && !isLoaded && !optionsLoading) {
      void hydrateIds(selectedValue);
    }
  }, [hydrateIds, optionRows, optionsLoading, selectedOptions, selectedValue]);

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: required ? `${label} is required` : false }}
      render={({ field, fieldState }) => {
        const options = new Map<string, OptionItem>();
        selectedOptions.forEach((option, key) => options.set(key, option));
        (optionRows ?? []).forEach((option) =>
          options.set(String(option.value), option),
        );

        return (
          <FieldShell
            name={name}
            label={label}
            required={required}
            helperText={helperText}
          >
            <div className="relative">
              <Select
                open={open}
                onOpenChange={(isOpen) => {
                  setOpen(isOpen);
                  if (!isOpen) optionsQuery.setSearch("");
                }}
                value={selectedValue}
                onValueChange={field.onChange}
                disabled={Boolean(
                  filters && Object.values(filters).some((value) => !value),
                )}
              >
                <SelectTrigger
                  id={name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.error ? `${name}-error` : undefined
                  }
                >
                  <SelectValue
                    placeholder={
                      optionsLoading
                        ? "Loading options…"
                        : `Select ${label.toLowerCase()}`
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  onScroll={(event) => {
                    const viewport = event.target as HTMLElement;
                    const nearEnd =
                      viewport.scrollHeight -
                        viewport.scrollTop -
                        viewport.clientHeight <=
                      48;
                    if (
                      nearEnd &&
                      optionsQuery.hasMore &&
                      !optionsQuery.isFetching &&
                      !loadingMoreRef.current
                    ) {
                      loadingMoreRef.current = true;
                      void Promise.resolve(optionsQuery.loadMore()).finally(
                        () => {
                          loadingMoreRef.current = false;
                        },
                      );
                    }
                  }}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <div className="sticky top-0 z-50 bg-popover p-2">
                    <Input
                      ref={searchRef}
                      aria-label={`Search ${label}`}
                      placeholder={`Search ${label.toLowerCase()}…`}
                      value={optionsQuery.search}
                      onChange={(event) =>
                        optionsQuery.setSearch(event.target.value)
                      }
                      className="h-8 text-sm"
                      onKeyDown={(event) => {
                        if (
                          ![
                            "ArrowDown",
                            "ArrowUp",
                            "Home",
                            "End",
                            "PageUp",
                            "PageDown",
                          ].includes(event.key)
                        ) {
                          event.stopPropagation();
                        }
                      }}
                    />
                  </div>
                  {options.size === 0 && !optionsLoading ? (
                    <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                      No options found
                    </p>
                  ) : (
                    [...options.values()].map((option) => (
                      <SelectItem
                        key={String(option.value)}
                        value={String(option.value)}
                        disabled={option.disabled}
                      >
                        <span className="flex flex-col">
                          <span>
                            {option.subLabel
                              ? `${option.label} · ${option.subLabel}`
                              : option.label}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                  {optionsQuery.hasMore && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-center text-xs text-primary hover:bg-accent"
                      disabled={optionsQuery.isFetching}
                      onClick={() => void optionsQuery.loadMore()}
                    >
                      {optionsQuery.isFetching
                        ? "Loading…"
                        : "Load more options"}
                    </button>
                  )}
                </SelectContent>
              </Select>
              {clearable && selectedValue && (
                <button
                  type="button"
                  className="absolute right-9 top-1/2 z-50 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Clear ${label}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => field.onChange("")}
                >
                  ×
                </button>
              )}
              {optionsQuery.isError && (
                <p role="alert" className="text-xs text-danger">
                  Could not load {label.toLowerCase()} options.
                </p>
              )}
            </div>
          </FieldShell>
        );
      }}
    />
  );
}

export function RHFSwitch({ name, label, helperText }: FieldProps) {
  const { register } = useFormContext();
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {helperText && (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        )}
      </span>
      <Switch
        id={name}
        aria-label={label}
        data-hm="switch"
        {...register(name)}
      />
    </label>
  );
}

export function RHFCheckbox({ name, label, required }: FieldProps) {
  const { register } = useFormContext();
  return (
    <label
      htmlFor={name}
      className="flex min-h-11 items-center gap-2 text-sm cursor-pointer"
    >
      <Checkbox
        id={name}
        data-hm="checkbox"
        {...register(name, {
          required: required ? `${label} is required` : false,
        })}
      />
      {label}
    </label>
  );
}

export function RHFRadioGroup({
  name,
  label,
  options,
}: FieldProps & { options: Array<{ value: string; label: string }> }) {
  const { register } = useFormContext();
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-10 items-center gap-2 text-sm cursor-pointer"
        >
          <Radio value={option.value} data-hm="radio" {...register(name)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

export function RHFCheckboxGroup({
  name,
  label,
  options,
}: FieldProps & { options: Array<{ value: string; label: string }> }) {
  const { register } = useFormContext();
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-10 items-center gap-2 text-sm cursor-pointer"
        >
          <Checkbox
            value={option.value}
            data-hm="checkbox"
            {...register(name)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

export function RHFSearchInput({
  name,
  label,
  placeholder = "Search",
}: FieldProps & { placeholder?: string }) {
  const { control } = useFormContext();
  const [draft, setDraft] = useState("");
  const debounced = useDebounce(draft);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FieldShell name={name} label={label}>
          <div className="relative">
            <Input
              id={name}
              type="search"
              placeholder={placeholder}
              className="pr-9"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <DebouncedValue value={debounced} onChange={field.onChange} />
          </div>
        </FieldShell>
      )}
    />
  );
}

function DebouncedValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  useEffect(() => {
    onChange(value);
  }, [onChange, value]);
  return null;
}

export function RHFCurrencyField({
  name,
  label,
  required,
  currency = "USD",
}: FieldProps & { currency?: string }) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];
  return (
    <FieldShell name={name} label={label} required={required}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {currency}
        </span>
        <Input
          id={name}
          type="number"
          step="0.01"
          min="0"
          className="pl-12"
          aria-invalid={Boolean(error)}
          {...register(name, {
            required: required ? `${label} is required` : false,
            valueAsNumber: true,
          })}
        />
      </div>
    </FieldShell>
  );
}

export function RHFCombobox({
  name,
  label,
  options,
  placeholder,
}: FieldProps & {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const { register } = useFormContext();
  const listId = `${name}-options`;
  return (
    <FieldShell name={name} label={label}>
      <Input
        id={name}
        list={listId}
        placeholder={placeholder ?? `Choose ${label.toLowerCase()}`}
        autoComplete="off"
        {...register(name)}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
    </FieldShell>
  );
}

export function RHFMultiSelect({
  name,
  label,
  options,
}: FieldProps & { options: Array<{ value: string; label: string }> }) {
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);
  return (
    <FieldShell name={name} label={label}>
      <Controller
        control={control}
        name={name}
        defaultValue={[]}
        render={({ field }) => {
          const values = Array.isArray(field.value)
            ? (field.value as string[])
            : [];
          const filteredOptions = options.filter(
            (option) =>
              !values.includes(option.value) &&
              option.label.toLowerCase().includes(search.trim().toLowerCase()),
          );
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {values.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                  >
                    {options.find((option) => option.value === value)?.label ??
                      value}
                    <button
                      type="button"
                      aria-label={`Remove ${options.find((option) => option.value === value)?.label ?? value}`}
                      onClick={() =>
                        field.onChange(values.filter((item) => item !== value))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Select
                open={open}
                onOpenChange={(isOpen) => {
                  setOpen(isOpen);
                  if (!isOpen) setSearch("");
                }}
                value=""
                onValueChange={(selectedValue) => {
                  if (selectedValue && !values.includes(selectedValue)) {
                    field.onChange([...values, selectedValue]);
                  }
                  setSearch("");
                }}
              >
                <SelectTrigger aria-label={label}>
                  <SelectValue placeholder={`Add ${label.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  <div className="sticky top-0 z-50 bg-popover p-2">
                    <Input
                      ref={searchRef}
                      aria-label={`Search ${label}`}
                      placeholder={`Search ${label.toLowerCase()}…`}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(event) => {
                        if (!event.key.startsWith("Arrow")) {
                          event.stopPropagation();
                        }
                      }}
                    />
                  </div>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  ) : (
                    <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                      No options found
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
          );
        }}
      />
    </FieldShell>
  );
}

export function RHFSegmentedControl({
  name,
  label,
  options,
}: FieldProps & { options: Array<{ value: string; label: string }> }) {
  const { control } = useFormContext();
  return (
    <FieldShell name={name} label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div
            role="group"
            aria-label={label}
            className="inline-flex rounded-lg border bg-muted p-1"
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                aria-pressed={field.value === option.value}
                className={`min-h-8 rounded-md px-3 text-xs ${field.value === option.value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => field.onChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      />
    </FieldShell>
  );
}

export function RHFPhoneInput(props: FieldProps) {
  return <RHFPhoneField {...props} />;
}

export function RHFTagsInput({ name, label }: FieldProps) {
  const { control } = useFormContext();
  const [draft, setDraft] = useState("");
  return (
    <FieldShell name={name} label={label}>
      <Controller
        control={control}
        name={name}
        defaultValue={[]}
        render={({ field }) => {
          const tags = Array.isArray(field.value)
            ? (field.value as string[])
            : [];
          const addTag = () => {
            const tag = draft.trim();
            if (tag && !tags.includes(tag)) field.onChange([...tags, tag]);
            setDraft("");
          };
          return (
            <div className="rounded-md border border-input bg-card p-2">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() =>
                        field.onChange(tags.filter((item) => item !== tag))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Input
                aria-label={`Add ${label}`}
                value={draft}
                className="mt-1 border-0 shadow-none focus-visible:ring-0"
                placeholder="Type and press Enter"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
              />
            </div>
          );
        }}
      />
    </FieldShell>
  );
}

export function RHFOtpInput({ name, label, required = true }: FieldProps) {
  const { register } = useFormContext();
  return (
    <FieldShell name={name} label={label}>
      <Input
        id={name}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        pattern="[0-9]{6}"
        className="text-center text-lg tracking-[.45em] tabular-nums"
        {...register(name, {
          required: required ? `${label} is required` : false,
          minLength: required
            ? { value: 6, message: "Enter the 6-digit code" }
            : undefined,
        })}
      />
    </FieldShell>
  );
}

function RHFFileField({
  name,
  label,
  accept,
  maxBytes,
  image = false,
}: FieldProps & { accept: string; maxBytes: number; image?: boolean }) {
  const { register, setValue, setError, clearErrors, watch } = useFormContext();
  const [preview, setPreview] = useState<string | null>(null);
  const value = watch(name);
  const files = value instanceof FileList ? value : null;
  const file = files?.item(0);
  useEffect(() => {
    if (!image || !file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, image]);
  return (
    <FieldShell name={name} label={label}>
      <div className="flex items-center gap-3">
        <label
          htmlFor={name}
          className="relative overflow-hidden flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 text-sm text-muted-foreground hover:bg-muted"
        >
          {image ? "Choose an image" : "Choose a file"}
          <Input
            id={name}
            type="file"
            accept={accept}
            className="sr-only"
            {...register(name, {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile && selectedFile.size > maxBytes) {
                  setError(name, {
                    type: "validate",
                    message: `Choose a file smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
                  });
                  setValue(name, null);
                  return;
                }
                clearErrors(name);
                setValue(name, event.target.files, { shouldValidate: true });
              },
            })}
          />
        </label>
        {image && preview && (
          <img
            src={preview}
            alt="Selected image preview"
            className="h-12 w-12 rounded-full object-cover"
          />
        )}
      </div>
    </FieldShell>
  );
}

export function RHFFileUpload({
  name,
  label,
  accept = "*/*",
  maxBytes = 10 * 1024 * 1024,
}: FieldProps & { accept?: string; maxBytes?: number }) {
  return (
    <RHFFileField
      name={name}
      label={label}
      accept={accept}
      maxBytes={maxBytes}
    />
  );
}

export function RHFImageUpload({
  name,
  label,
  maxBytes = 5 * 1024 * 1024,
}: FieldProps & { maxBytes?: number }) {
  return (
    <RHFFileField
      name={name}
      label={label}
      accept="image/*"
      maxBytes={maxBytes}
      image
    />
  );
}

export function RHFColorPicker({ name, label }: FieldProps) {
  const { register } = useFormContext();
  return (
    <FieldShell name={name} label={label}>
      <Input
        id={name}
        type="color"
        className="h-10 cursor-pointer p-1"
        {...register(name)}
      />
    </FieldShell>
  );
}
