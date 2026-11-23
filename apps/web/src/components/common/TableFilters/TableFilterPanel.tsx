import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAsyncOptions } from "@/hooks/use-async-options";
import { useDebounce } from "@/hooks/use-debounce";
import type { FilterField, FilterValue, FilterValues } from "./types";
import type { OptionItem } from "@/types/select";

function isEmpty(value: FilterValue): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const hasValue = (part: unknown) =>
      part !== undefined && part !== null && part !== "";
    return !hasValue(value.from) && !hasValue(value.to);
  }
  return false;
}

function cleanFilters(values: FilterValues): FilterValues {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => !isEmpty(value)),
  );
}

function displayValue(
  field: FilterField,
  value: FilterValue,
  asyncLabels: Record<string, string>,
): string {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        field.type === "async-select"
          ? (asyncLabels[String(item)] ?? String(item))
          : field.type === "select" ||
              field.type === "multiselect" ||
              field.type === "status"
            ? (field.options.find(
                (option) => String(option.value) === String(item),
              )?.label ?? String(item))
            : String(item),
      )
      .join(", ");
  }
  if (field.type === "async-select" && value != null) {
    return asyncLabels[String(value)] ?? String(value);
  }
  if ((field.type === "select" || field.type === "status") && value != null) {
    return (
      field.options.find((option) => String(option.value) === String(value))
        ?.label ?? String(value)
    );
  }
  if (typeof value === "object" && value) {
    return [value.from, value.to].filter(Boolean).join(" – ");
  }
  return String(value ?? "");
}

function rangeValue(value: FilterValue): { from: string; to: string } {
  if (typeof value !== "object" || !value || Array.isArray(value)) {
    return { from: "", to: "" };
  }
  return { from: String(value.from ?? ""), to: String(value.to ?? "") };
}

function AsyncFilterControl({
  field,
  value,
  values,
  visible,
  onChange,
  onLabels,
}: {
  field: Extract<FilterField, { type: "async-select" }>;
  value: FilterValue;
  values: FilterValues;
  visible: boolean;
  onChange: (value: FilterValue) => void;
  onLabels: (labels: Record<string, string>) => void;
}) {
  const dependency = field.dependsOn ? values[field.dependsOn] : undefined;
  const filters =
    field.dependsOn && !isEmpty(dependency)
      ? { [field.dependsOn]: dependency }
      : {};
  const options = useAsyncOptions({
    endpoint: field.endpoint,
    filters,
    enabled: visible && (!field.dependsOn || !isEmpty(dependency)),
  });
  const selectedIds = Array.isArray(value)
    ? value.map(String)
    : isEmpty(value)
      ? []
      : [String(value)];
  const selectedIdsKey = selectedIds.join("|");
  const hydratedOptions = options.selectedOptions;
  const hydrateIds = options.hydrateIds;

  useEffect(() => {
    const known = new Map<string, string>();
    hydratedOptions.forEach((option, id) => known.set(id, option.label));
    options.data?.rows?.forEach((option) => {
      if (option && option.value !== undefined && option.value !== null) {
        known.set(String(option.value), option.label ?? String(option.value));
      }
    });
    if (known.size) onLabels(Object.fromEntries(known));
  }, [onLabels, options.data?.rows, hydratedOptions]);

  useEffect(() => {
    const unresolved = selectedIdsKey
      .split("|")
      .filter((id) => !hydratedOptions.has(id));
    if (selectedIdsKey && unresolved.length) void hydrateIds(unresolved);
  }, [hydrateIds, hydratedOptions, selectedIdsKey]);

  const updateSelection = (id: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...selectedIds, id])]
      : selectedIds.filter((item) => item !== id);
    onChange(field.multiple ? next : (next[0] ?? ""));
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium">{field.label}</legend>
      <Input
        aria-label={`Search ${field.label}`}
        value={options.search}
        placeholder={`Search ${field.label.toLowerCase()}`}
        onChange={(event) => options.setSearch(event.target.value)}
      />
      <div className="max-h-36 overflow-y-auto rounded-md border p-1">
        {options.data?.rows
          ?.filter((option): option is OptionItem =>
            Boolean(
              option && option.value !== undefined && option.value !== null,
            ),
          )
          .map((option) => {
            const id = String(option.value);
            const checked = selectedIds.includes(id);
            return (
              <label
                key={id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
              >
                {field.multiple ? (
                  <Checkbox
                    checked={checked}
                    onChange={(event) =>
                      updateSelection(id, event.target.checked)
                    }
                  />
                ) : (
                  <Radio
                    name={`filter-${field.key}`}
                    checked={checked}
                    onChange={(event) =>
                      updateSelection(id, event.target.checked)
                    }
                  />
                )}
                <span>{option.label}</span>
              </label>
            );
          })}
        {!options.isLoading && !options.data?.rows?.length && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No options found
          </p>
        )}
      </div>
      {options.hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={options.isFetching}
          onClick={() => void options.loadMore()}
        >
          {options.isFetching ? "Loading…" : "Load more"}
        </Button>
      )}
      {selectedIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(field.multiple ? [] : "")}
        >
          Clear {field.label.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}

function FilterControl({
  field,
  value,
  values,
  visible,
  onChange,
  onLabels,
}: {
  field: FilterField;
  value: FilterValue;
  values: FilterValues;
  visible: boolean;
  onChange: (value: FilterValue) => void;
  onLabels: (labels: Record<string, string>) => void;
}) {
  if (field.type === "async-select") {
    return (
      <AsyncFilterControl
        field={field}
        value={value}
        values={values}
        visible={visible}
        onChange={onChange}
        onLabels={onLabels}
      />
    );
  }
  const id = `filter-${field.key}`;
  const label = (
    <label htmlFor={id} className="block text-xs font-medium">
      {field.label}
    </label>
  );
  if (
    field.type === "text" ||
    field.type === "date" ||
    field.type === "number"
  ) {
    return (
      <div className="space-y-2">
        {label}
        <Input
          id={id}
          type={field.type}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(event) =>
            onChange(
              field.type === "number" && event.target.value
                ? Number(event.target.value)
                : event.target.value,
            )
          }
        />
      </div>
    );
  }
  if (field.type === "daterange" || field.type === "numberrange") {
    const range = rangeValue(value);
    const inputType = field.type === "daterange" ? "date" : "number";
    const updateRange = (key: "from" | "to", raw: string) =>
      onChange({
        ...range,
        [key]: inputType === "number" && raw ? Number(raw) : raw,
      });
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">{field.label}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label={`${field.label} from`}
            type={inputType}
            value={range.from}
            onChange={(event) => updateRange("from", event.target.value)}
          />
          <Input
            aria-label={`${field.label} to`}
            type={inputType}
            value={range.to}
            onChange={(event) => updateRange("to", event.target.value)}
          />
        </div>
      </fieldset>
    );
  }
  if (field.type === "boolean") {
    return (
      <label
        htmlFor={id}
        className="flex min-h-10 items-center justify-between gap-3 text-xs font-medium cursor-pointer"
      >
        {field.label}
        <Checkbox
          id={id}
          checked={value === true}
          onChange={(event) =>
            onChange(event.target.checked ? true : undefined)
          }
        />
      </label>
    );
  }
  if (field.type === "status") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">{field.label}</legend>
        <div className="flex flex-wrap gap-1">
          {field.options.map((option) => {
            const active = String(value ?? "") === String(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs ${active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                onClick={() => onChange(active ? undefined : option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium">{field.label}</legend>
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
          {field.options.map((option) => {
            const optionValue = String(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(optionValue)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, optionValue]
                        : selected.filter((item) => item !== optionValue),
                    )
                  }
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (field.type !== "select") return null;
  const currentValue = value ? String(value) : "__all__";
  return (
    <div className="space-y-2">
      {label}
      <Select
        value={currentValue}
        onValueChange={(val) => onChange(val === "__all__" ? undefined : val)}
      >
        <SelectTrigger id={id} className="h-10 w-full" data-hm="select">
          <SelectValue
            placeholder={
              field.placeholder ?? `All ${field.label.toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {field.placeholder ?? `All ${field.label.toLowerCase()}`}
          </SelectItem>
          {field.options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TableFilterPanel({
  config,
  value,
  onApply,
  onReset,
  applyOnChange = false,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  config: FilterField[];
  value: FilterValues;
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
  applyOnChange?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [mobile, setMobile] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(value);
  const [asyncLabels, setAsyncLabels] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debouncedDraft = useDebounce(draft, 250);
  const active = useMemo(() => cleanFilters(value), [value]);
  const activeCount = Object.keys(active).length;

  useEffect(() => {
    if (!window.matchMedia) {
      setMobile(window.innerWidth < 768);
      return;
    }
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const timer = window.setTimeout(() => {
      const focusable = firstFieldRef.current?.querySelector<HTMLElement>(
        "input, select, button",
      );
      focusable?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, value]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.toggleAttribute("inert", !open);
    }
  }, [open]);

  useEffect(() => {
    if (applyOnChange && open) onApply(cleanFilters(debouncedDraft));
  }, [applyOnChange, debouncedDraft, onApply, open]);

  const updateLabels = useCallback((labels: Record<string, string>) => {
    setAsyncLabels((previous) => {
      if (
        Object.entries(labels).every(([key, label]) => previous[key] === label)
      ) {
        return previous;
      }
      return { ...previous, ...labels };
    });
  }, []);

  const apply = () => {
    onApply(cleanFilters(draft));
    setOpen(false);
  };
  const reset = () => {
    setDraft({});
    onReset();
    setOpen(false);
  };
  const updateDraft = (key: string, nextValue: FilterValue) => {
    setDraft((previous) => {
      const next = { ...previous, [key]: nextValue };
      config.forEach((field) => {
        if (field.dependsOn === key) delete next[field.key];
      });
      return next;
    });
  };
  const panelContent = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Clear all
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {config.map((field, index) => (
          <div
            key={field.key}
            ref={index === 0 ? firstFieldRef : undefined}
            style={
              field.width ? { gridColumn: `span ${field.width}` } : undefined
            }
            className="min-w-0"
          >
            <FilterControl
              field={field}
              value={draft[field.key]}
              values={draft}
              visible={open}
              onChange={(next) => updateDraft(field.key, next)}
              onLabels={updateLabels}
            />
          </div>
        ))}
      </div>
      {!applyOnChange && (
        <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t bg-card py-3 pt-4">
          <Button type="button" variant="ghost" onClick={reset}>
            Clear all
          </Button>
          <Button type="button" onClick={apply}>
            Apply filters
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="border-b">
      {showTrigger && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <TableFilterButton
            value={value}
            open={open}
            onClick={() => setOpen(!open)}
          />
          {activeCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      )}
      {activeCount > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-4 pb-3"
          aria-label="Active filters"
        >
          {Object.entries(active).map(([key, filterValue]) => {
            const field = config.find((item) => item.key === key);
            const label = field?.label ?? key;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
              >
                {label}:{" "}
                {field
                  ? displayValue(field, filterValue, asyncLabels)
                  : String(filterValue)}
                <button
                  type="button"
                  aria-label={`Remove ${label} filter`}
                  onClick={() =>
                    onApply(cleanFilters({ ...active, [key]: undefined }))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Clear all
          </Button>
        </div>
      )}
      {mobile ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            id="table-filter-panel"
            className="fixed bottom-0 left-0 top-auto max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <DialogTitle className="sr-only">Filters</DialogTitle>
            {panelContent}
          </DialogContent>
        </Dialog>
      ) : (
        <div
          id="table-filter-panel"
          ref={panelRef}
          aria-hidden={!open}
          className={`overflow-hidden px-4 transition-[max-height,opacity,padding] duration-200 motion-reduce:transition-none ${open ? "max-h-[1000px] pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"}`}
        >
          {panelContent}
        </div>
      )}
    </div>
  );
}

export function TableFilterButton({
  value,
  open,
  onClick,
}: {
  value: FilterValues;
  open: boolean;
  onClick: () => void;
}) {
  const activeCount = Object.keys(cleanFilters(value)).length;
  return (
    <Button
      type="button"
      variant="outline"
      className={`h-10 rounded-md border px-3 text-sm font-normal hover:bg-muted ${open ? "ring-1 ring-ring" : ""}`}
      aria-expanded={open}
      aria-controls="table-filter-panel"
      onClick={onClick}
    >
      <ListFilter className="h-4 w-4" />
      Filters{activeCount > 0 ? ` ${activeCount}` : ""}
    </Button>
  );
}
