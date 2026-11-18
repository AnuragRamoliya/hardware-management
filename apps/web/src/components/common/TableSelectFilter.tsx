import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncOptions } from "@/hooks/use-async-options";
import { ENUMS } from "@/utils/constants";

export interface TableSelectFilterConfig {
  name: string;
  label: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  optionsResource?: string;
  multiple?: boolean;
}

export function TableSelectFilter({
  config,
  value,
  onChange,
}: {
  config: TableSelectFilterConfig;
  value: string | number | boolean | null | Array<string | number> | undefined;
  onChange: (value: string | number | null | Array<string | number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadingMoreRef = useRef(false);
  const selected = Array.isArray(value)
    ? value.map(String)
    : value == null || value === ""
      ? []
      : [String(value)];
  const selectedIds = selected.join(",");
  const asyncOptions = useAsyncOptions({
    endpoint: config.optionsResource ? `${config.optionsResource}/options` : "",
    enabled: Boolean(config.optionsResource) && open,
  });
  const optionRows = asyncOptions.data?.rows;
  const hydratedOptions = asyncOptions.selectedOptions;
  const hydrateIds = asyncOptions.hydrateIds;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const unresolved = selectedIds
      ? selectedIds
          .split(",")
          .filter(
            (id) =>
              !optionRows?.some((option) => String(option.value) === id) &&
              !hydratedOptions.has(id),
          )
      : [];
    if (config.optionsResource && unresolved.length > 0) {
      void hydrateIds(unresolved);
    }
  }, [
    config.optionsResource,
    hydrateIds,
    hydratedOptions,
    optionRows,
    selectedIds,
  ]);

  const options = useMemo(() => {
    const byValue = new Map<string, string>();
    config.options?.forEach((option) =>
      byValue.set(option.value, option.label),
    );
    hydratedOptions.forEach((option, id) => byValue.set(id, option.label));
    optionRows?.forEach((option) =>
      byValue.set(String(option.value), option.label),
    );
    return byValue;
  }, [config.options, hydratedOptions, optionRows]);

  const update = (id: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...selected, id])]
      : selected.filter((item) => item !== id);
    onChange(config.multiple ? next : (next[0] ?? null));
  };

  const searchOptions = asyncOptions.search;
  const filteredStaticOptions = (config.options ?? []).filter((option) =>
    option.label.toLowerCase().includes(searchOptions.trim().toLowerCase()),
  );
  const isLoading = Boolean(config.optionsResource) && asyncOptions.isLoading;
  const hasOptions = config.optionsResource
    ? (optionRows?.length ?? 0) > 0
    : filteredStaticOptions.length > 0;

  return (
    <div className="min-w-44 space-y-2 rounded-md border bg-card p-2">
      <span className="block px-1 text-xs font-medium">{config.label}</span>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              {options.get(id) ?? id}
              <button
                type="button"
                aria-label={`Remove ${config.label} filter ${options.get(id) ?? id}`}
                className="rounded-sm opacity-70 hover:opacity-100"
                onClick={() => update(id, false)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Select
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) asyncOptions.setSearch("");
        }}
        value={config.multiple ? "" : (selected[0] ?? "")}
        onValueChange={(id) => update(id, true)}
      >
        <SelectTrigger
          aria-label={`${config.label} filter`}
          className="h-9 text-xs"
        >
          <SelectValue
            placeholder={
              selected.length > 0 && config.multiple
                ? `${selected.length} selected`
                : `Select ${config.label.toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          onScroll={(event) => {
            const viewport = event.target as HTMLElement;
            const nearEnd =
              viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <=
              48;
            if (
              nearEnd &&
              asyncOptions.hasMore &&
              !asyncOptions.isFetching &&
              !loadingMoreRef.current
            ) {
              loadingMoreRef.current = true;
              void Promise.resolve(asyncOptions.loadMore()).finally(() => {
                loadingMoreRef.current = false;
              });
            }
          }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="sticky top-0 z-10 bg-popover p-2">
            <Input
              ref={searchRef}
              aria-label={`Search ${config.label}`}
              className="h-8 text-sm"
              placeholder={`Search ${config.label.toLowerCase()}`}
              value={asyncOptions.search}
              onChange={(event) => asyncOptions.setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (!event.key.startsWith("Arrow")) event.stopPropagation();
              }}
            />
          </div>
          {config.optionsResource
            ? (optionRows ?? []).map((option) => {
                const id = String(option.value);
                const selectedOption = selected.includes(id);
                return (
                  <SelectItem
                    key={id}
                    value={id}
                    disabled={selectedOption}
                    onSelect={
                      config.multiple
                        ? (event) => {
                            event.preventDefault();
                            update(id, true);
                          }
                        : undefined
                    }
                  >
                    {option.label}
                    {option.subLabel ? ` · ${option.subLabel}` : ""}
                  </SelectItem>
                );
              })
            : filteredStaticOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={selected.includes(option.value)}
                  onSelect={
                    config.multiple
                      ? (event) => {
                          event.preventDefault();
                          update(option.value, true);
                        }
                      : undefined
                  }
                >
                  {option.label}
                </SelectItem>
              ))}
          {!hasOptions && !isLoading && (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              No options found
            </p>
          )}
          {isLoading && (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              Loading options…
            </p>
          )}
          {config.optionsResource && asyncOptions.hasMore && (
            <button
              type="button"
              className="w-full px-3 py-2 text-center text-xs text-primary hover:bg-accent"
              disabled={asyncOptions.isFetching}
              onClick={() => void asyncOptions.loadMore()}
            >
              {asyncOptions.isFetching ? "Loading…" : "Load more"}
            </button>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export const RECORD_STATUS_FILTER = {
  key: "status",
  label: "Status",
  type: "status",
  options: ENUMS.recordStatus,
} as const;
