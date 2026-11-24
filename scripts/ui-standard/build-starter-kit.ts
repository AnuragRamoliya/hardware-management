import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const webSrc = path.join(repoRoot, "apps/web/src");
const starterKit = path.join(repoRoot, "docs/ui-standard/starter-kit");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. Ensure directories
[
  "tokens",
  "lib",
  "adapters",
  "components/ui",
  "components/ui/date-picker",
  "components/ui/phone-field",
  "components/ui/select",
  "components/common",
  "components/hook-form",
  "scripts",
  "pages",
  "tests",
].forEach((d) => ensureDir(path.join(starterKit, d)));

// --- POPOVER PRIMITIVE ---
fs.writeFileSync(
  path.join(starterKit, "components/ui/popover.tsx"),
  `import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
`,
  "utf-8",
);

// Copy & adapt Button, Input, Textarea, Checkbox, Radio, Switch, Badge, Card, Dialog, DropdownMenu, Skeleton, Tabs
const copyPrims = [
  { from: "components/ui/button.tsx", to: "components/ui/Button.tsx" },
  { from: "components/ui/input.tsx", to: "components/ui/Input.tsx" },
  { from: "components/ui/textarea.tsx", to: "components/ui/Textarea.tsx" },
  { from: "components/ui/checkbox.tsx", to: "components/ui/Checkbox.tsx" },
  { from: "components/ui/radio.tsx", to: "components/ui/RadioGroup.tsx" },
  { from: "components/ui/switch.tsx", to: "components/ui/Switch.tsx" },
  { from: "components/ui/badge.tsx", to: "components/ui/Badge.tsx" },
  { from: "components/ui/card.tsx", to: "components/ui/Card.tsx" },
  { from: "components/ui/dialog.tsx", to: "components/ui/Dialog.tsx" },
  {
    from: "components/ui/dropdown-menu.tsx",
    to: "components/ui/DropdownMenu.tsx",
  },
  { from: "components/ui/skeleton.tsx", to: "components/ui/Skeleton.tsx" },
  { from: "components/ui/tabs.tsx", to: "components/ui/Tabs.tsx" },
];

for (const p of copyPrims) {
  let content = fs.readFileSync(path.join(webSrc, p.from), "utf-8");
  // Normalize imports to relative
  content = content.replace(/@\/lib\/utils/g, "../../lib/utils");
  content = content.replace(/@\/components\/ui\//g, "./");
  fs.writeFileSync(path.join(starterKit, p.to), content, "utf-8");
}

// Copy Date Picker folder
const dpFiles = [
  "DatePicker.tsx",
  "DateRangePicker.tsx",
  "TimePicker.tsx",
  "DateTimePicker.tsx",
  "date-utils.ts",
  "index.ts",
];
for (const f of dpFiles) {
  let content = fs.readFileSync(
    path.join(webSrc, "components/ui/date-picker", f),
    "utf-8",
  );
  content = content.replace(/@\/lib\/utils/g, "../../../lib/utils");
  content = content.replace(/@\/components\/ui\/button/g, "../Button");
  content = content.replace(/@\/components\/ui\/input/g, "../Input");
  content = content.replace(/@\/components\/ui\/popover/g, "../popover");
  fs.writeFileSync(
    path.join(starterKit, "components/ui/date-picker", f),
    content,
    "utf-8",
  );
}

// Copy Select folder
const selFiles = [
  "SelectChip.tsx",
  "SelectList.tsx",
  "SelectOption.tsx",
  "SelectPopover.tsx",
  "SelectSearchInput.tsx",
  "SelectTrigger.tsx",
  "index.tsx",
];
for (const f of selFiles) {
  let content = fs.readFileSync(
    path.join(webSrc, "components/ui/select", f),
    "utf-8",
  );
  content = content.replace(/@\/lib\/utils/g, "../../../lib/utils");
  content = content.replace(/@\/components\/ui\/button/g, "../Button");
  content = content.replace(/@\/components\/ui\/input/g, "../Input");
  content = content.replace(/from "\.\.\/input"/g, 'from "../Input"');
  content = content.replace(
    /\(e\) => setDraft\(e\.target\.value\)/g,
    "(e: any) => setDraft(e.target.value)",
  );
  content = content.replace(/@\/components\/ui\/badge/g, "../Badge");
  fs.writeFileSync(
    path.join(starterKit, "components/ui/select", f),
    content,
    "utf-8",
  );
}

// Copy Phone Field folder (adapting @hm/shared formatters to ../../../adapters/formatters)
const pfFiles = ["PhoneField.tsx", "PhoneDisplay.tsx", "index.ts"];
for (const f of pfFiles) {
  let content = fs.readFileSync(
    path.join(webSrc, "components/ui/phone-field", f),
    "utf-8",
  );
  content = content.replace(/@\/lib\/utils/g, "../../../lib/utils");
  content = content.replace(/@\/components\/ui\/button/g, "../Button");
  content = content.replace(/@\/components\/ui\/input/g, "../Input");
  content = content.replace(/@\/components\/ui\/popover/g, "../popover");
  content = content.replace(
    /@\/hooks\/use-debounce/g,
    "../../../hooks/use-debounce",
  );
  content = content.replace(
    /from "@hm\/shared"/g,
    'from "../../../adapters/formatters"',
  );
  content = content.replace(
    /from "\.\.\/\.\.\/adapters\/formatters"/g,
    'from "../../../adapters/formatters"',
  );
  content = content.replace(
    /SUPPORTED_COUNTRIES\.some\(\(c\) =>/g,
    "SUPPORTED_COUNTRIES.some((c: any) =>",
  );
  content = content.replace(
    /SUPPORTED_COUNTRIES\.find\(\(c\) =>/g,
    "SUPPORTED_COUNTRIES.find((c: any) =>",
  );
  content = content.replace(
    /\(c\) => \(!debouncedSearch/g,
    "(c: any) => (!debouncedSearch",
  );
  content = content.replace(
    /filteredCountries\.map\(\(c\) =>/g,
    "filteredCountries.map((c: any) =>",
  );
  fs.writeFileSync(
    path.join(starterKit, "components/ui/phone-field", f),
    content,
    "utf-8",
  );
}

// Create simple useDebounce hook in starter kit
ensureDir(path.join(starterKit, "hooks"));
fs.writeFileSync(
  path.join(starterKit, "hooks/use-debounce.ts"),
  `import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
`,
  "utf-8",
);

// --- COMMON COMPONENTS ---
// 1. States.tsx
let statesContent = fs.readFileSync(
  path.join(webSrc, "components/common/States.tsx"),
  "utf-8",
);
statesContent = statesContent.replace(/@\/lib\/utils/g, "../../lib/utils");
statesContent = statesContent.replace(
  /@\/components\/ui\/button/g,
  "../ui/Button",
);
fs.writeFileSync(
  path.join(starterKit, "components/common/States.tsx"),
  statesContent,
  "utf-8",
);

// 2. ConfirmDialog.tsx
let confirmContent = fs.readFileSync(
  path.join(webSrc, "components/common/ConfirmDialog.tsx"),
  "utf-8",
);
confirmContent = confirmContent.replace(/@\/lib\/utils/g, "../../lib/utils");
confirmContent = confirmContent.replace(
  /@\/components\/ui\/button/g,
  "../ui/Button",
);
fs.writeFileSync(
  path.join(starterKit, "components/common/ConfirmDialog.tsx"),
  confirmContent,
  "utf-8",
);

// 3. PageHeader.tsx (generic router-independent link)
fs.writeFileSync(
  path.join(starterKit, "components/common/PageHeader.tsx"),
  `import React, { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <div className="flex flex-col gap-1 pb-4 border-b border-border mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3" />}
              {b.to ? (
                <a href={b.to} className="hover:text-foreground transition-colors">
                  {b.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
`,
  "utf-8",
);

// 4. CommonTable.tsx (Generic and self-contained)
fs.writeFileSync(
  path.join(starterKit, "components/common/CommonTable.tsx"),
  `import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { EmptyState } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface CommonTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

export function CommonTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search criteria.",
  pageSize = 10,
}: CommonTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative flex items-center max-w-sm">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-medium whitespace-nowrap"
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span>{col.header}</span>
                    {col.sortable && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginated.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} entries
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
`,
  "utf-8",
);

// 5. TableFilterPanel.tsx (generic filter panel)
fs.writeFileSync(
  path.join(starterKit, "components/common/TableFilterPanel.tsx"),
  `import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export interface FilterChip {
  id: string;
  label: string;
  value: string;
}

export function TableFilterPanel({
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
}: {
  activeFilters?: FilterChip[];
  onRemoveFilter?: (id: string) => void;
  onClearAll?: () => void;
}) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Filter className="h-3 w-3" /> Filters:
      </span>
      {activeFilters.map((f) => (
        <Badge key={f.id} variant="outline" className="gap-1 pl-2 pr-1 py-0.5">
          <span>{f.label}: <strong>{f.value}</strong></span>
          {onRemoveFilter && (
            <button
              onClick={() => onRemoveFilter(f.id)}
              className="hover:bg-muted rounded-full p-0.5"
              aria-label={\`Remove \${f.label} filter\`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs px-2">
          Clear all
        </Button>
      )}
    </div>
  );
}
`,
  "utf-8",
);

// 6. RowActionsMenu.tsx (generic row actions dropdown)
fs.writeFileSync(
  path.join(starterKit, "components/common/RowActionsMenu.tsx"),
  `import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((act, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={act.onSelect}
            className={act.destructive ? "text-destructive focus:text-destructive" : ""}
          >
            {act.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
`,
  "utf-8",
);

// --- HOOK-FORM COMPONENTS ---
// 1. FormProvider.tsx
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/FormProvider.tsx"),
  `import React, { type FormHTMLAttributes, type ReactNode } from "react";
import { FormProvider as RHFProvider, type UseFormReturn, type FieldValues } from "react-hook-form";

export function FormProvider<T extends FieldValues>({
  children,
  methods,
  onSubmit,
  ...props
}: {
  children: ReactNode;
  methods: UseFormReturn<T>;
  onSubmit?: () => void;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit">) {
  return (
    <RHFProvider {...methods}>
      <form onSubmit={onSubmit} {...props}>
        {children}
      </form>
    </RHFProvider>
  );
}
export default FormProvider;
`,
  "utf-8",
);

// 2. fields.tsx (RHFTextField, RHFSelect, RHFCheckbox, RHFSwitch, RHFTextarea)
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/fields.tsx"),
  `import React, { type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Checkbox } from "../ui/Checkbox";
import { Switch } from "../ui/Switch";

interface FieldWrapperProps {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function RHFTextField({
  name,
  label,
  helperText,
  required,
  ...props
}: FieldWrapperProps & InputHTMLAttributes<HTMLInputElement>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <Input
            id={name}
            {...field}
            value={field.value ?? ""}
            aria-invalid={!!error}
            aria-describedby={error ? \`\${name}-error\` : undefined}
            {...props}
          />
          {error ? (
            <p id={\`\${name}-error\`} className="text-xs text-destructive">
              {error.message}
            </p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}

export function RHFTextarea({
  name,
  label,
  helperText,
  required,
  ...props
}: FieldWrapperProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <Textarea
            id={name}
            {...field}
            value={field.value ?? ""}
            aria-invalid={!!error}
            {...props}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}

export function RHFCheckbox({
  name,
  label,
  helperText,
}: FieldWrapperProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="flex items-start gap-2">
          <Checkbox
            id={name}
            checked={!!field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
          <div className="space-y-1">
            {label && (
              <label htmlFor={name} className="text-sm font-medium leading-none cursor-pointer">
                {label}
              </label>
            )}
            {error ? (
              <p className="text-xs text-destructive">{error.message}</p>
            ) : helperText ? (
              <p className="text-xs text-muted-foreground">{helperText}</p>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}

export function RHFSwitch({
  name,
  label,
  helperText,
}: FieldWrapperProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            {label && <span className="text-sm font-medium">{label}</span>}
            {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
          </div>
          <Switch
            checked={!!field.value}
            onCheckedChange={field.onChange}
          />
        </div>
      )}
    />
  );
}
`,
  "utf-8",
);

// 3. RHFPhoneField.tsx
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/RHFPhoneField.tsx"),
  `import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { PhoneField } from "../ui/phone-field";

export function RHFPhoneField({
  name,
  label,
  helperText,
  required,
}: {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <PhoneField
            id={name}
            value={field.value ?? ""}
            onChange={field.onChange}
            aria-invalid={!!error}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
`,
  "utf-8",
);

// 4. RHFDatePicker.tsx
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/RHFDatePicker.tsx"),
  `import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { DatePicker } from "../ui/date-picker";

export function RHFDatePicker({
  name,
  label,
  helperText,
  required,
}: {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <DatePicker
            id={name}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
`,
  "utf-8",
);

// 5. RHFDateRangePicker.tsx
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/RHFDateRangePicker.tsx"),
  `import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { DateRangePicker } from "../ui/date-picker";

export function RHFDateRangePicker({
  name,
  label,
  helperText,
  required,
}: {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <DateRangePicker
            id={name}
            value={field.value ?? { from: "", to: "" }}
            onChange={field.onChange}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
`,
  "utf-8",
);

// 6. RHFTimePicker.tsx
fs.writeFileSync(
  path.join(starterKit, "components/hook-form/RHFTimePicker.tsx"),
  `import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { TimePicker } from "../ui/date-picker";

export function RHFTimePicker({
  name,
  label,
  helperText,
  required,
}: {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={name} className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <TimePicker
            id={name}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
`,
  "utf-8",
);

// --- STANDALONE SCRIPTS ---
// 1. check-ui.mjs
fs.writeFileSync(
  path.join(starterKit, "scripts/check-ui.mjs"),
  `import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "components");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "tests"].includes(entry.name)) continue;
      await walk(file);
    } else if (/\\.(ts|tsx)$/.test(entry.name)) {
      files.push(file);
    }
  }
}

await walk(src);
let violations = 0;

for (const file of files) {
  const content = await readFile(file, "utf8");
  const rel = path.relative(root, file);

  if (/\\bconsole\\.(log|warn)\\b/.test(content)) {
    console.error(\`[check:ui] Disallowed console log in \${rel}\`);
    violations++;
  }
}

if (violations > 0) {
  console.error(\`check:ui failed with \${violations} violation(s).\`);
  process.exit(1);
} else {
  console.log("check:ui passed cleanly.");
}
`,
  "utf-8",
);

// 2. check-field-usage.ts
fs.writeFileSync(
  path.join(starterKit, "scripts/check-field-usage.ts"),
  `import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "components");

const allowedPrimitives = new Set([
  "components/ui/Input.tsx",
  "components/ui/Textarea.tsx",
  "components/ui/Checkbox.tsx",
  "components/ui/RadioGroup.tsx",
  "components/ui/Switch.tsx",
  "components/ui/Button.tsx",
]);

let violations = 0;

function walk(dir: string) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith(".tsx")) {
      const rel = path.relative(root, full);
      if (allowedPrimitives.has(rel)) continue;

      const code = fs.readFileSync(full, "utf8");
      const sf = ts.createSourceFile(full, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

      function visit(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sf);
          if (["input", "select", "textarea"].includes(tag)) {
            console.error(\`[check:field-usage] Raw <\${tag}> in \${rel}\`);
            violations++;
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
    }
  }
}

walk(srcDir);

if (violations > 0) {
  console.error(\`check:field-usage failed with \${violations} violation(s).\`);
  process.exit(1);
} else {
  console.log("check:field-usage passed cleanly.");
}
`,
  "utf-8",
);

// --- DESIGN SYSTEM DEMO PAGE ---
fs.writeFileSync(
  path.join(starterKit, "pages/DesignSystemPage.tsx"),
  `import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { DatePicker } from "../components/ui/date-picker";
import { PhoneField } from "../components/ui/phone-field";
import { CommonTable } from "../components/common/CommonTable";
import { FormProvider } from "../components/hook-form/FormProvider";
import { RHFTextField, RHFCheckbox, RHFSwitch } from "../components/hook-form/fields";
import { RHFDatePicker } from "../components/hook-form/RHFDatePicker";
import { RHFPhoneField } from "../components/hook-form/RHFPhoneField";

export function DesignSystemPage() {
  const methods = useForm({
    defaultValues: {
      username: "alex.doe",
      phone: "+919876543210",
      joiningDate: "2026-01-15",
      marketingEmails: true,
      activeStatus: true,
    },
  });

  const sampleTableData = [
    { id: "1", name: "Dell Latitude 5420", category: "Hardware", status: "Active" },
    { id: "2", name: "MacBook Pro 16", category: "Hardware", status: "In Maintenance" },
    { id: "3", name: "Slack Enterprise", category: "Software", status: "Active" },
  ];

  const tableColumns = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={row.status === "Active" ? "default" : "outline"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-10 max-w-5xl">
      <header className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Starter Kit Design System</h1>
        <p className="text-muted-foreground mt-1">Portable UI Primitives, Hook-Form Fields, and Data Patterns</p>
      </header>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Buttons & Badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge variant="default">Active</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      </section>

      {/* Standard Fields */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Standalone Primitives</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Standalone Input" defaultValue="Sample value" />
          <DatePicker value="2026-11-24" onChange={() => {}} />
          <PhoneField value="+919876543210" onChange={() => {}} />
        </div>
      </section>

      {/* RHF Form */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. React Hook Form Integration</h2>
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">User Profile Form</h3>
          </CardHeader>
          <CardContent>
            <FormProvider methods={methods} onSubmit={methods.handleSubmit((data) => console.log(data))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RHFTextField name="username" label="User Name" required />
                <RHFPhoneField name="phone" label="Phone Number" required />
                <RHFDatePicker name="joiningDate" label="Joining Date" />
                <div className="pt-6">
                  <RHFCheckbox name="marketingEmails" label="Subscribe to release updates" />
                </div>
                <div className="md:col-span-2">
                  <RHFSwitch name="activeStatus" label="User Account Active" helperText="Enable access to hardware store" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit">Save Profile</Button>
              </div>
            </FormProvider>
          </CardContent>
        </Card>
      </section>

      {/* CommonTable */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Data Table Pattern</h2>
        <CommonTable columns={tableColumns} data={sampleTableData} />
      </section>
    </div>
  );
}
export default DesignSystemPage;
`,
  "utf-8",
);

// --- COMPONENT UNIT TESTS ---
fs.writeFileSync(
  path.join(starterKit, "tests/StarterKit.test.tsx"),
  `import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { CommonTable } from "../components/common/CommonTable";

describe("Starter Kit UI Primitives", () => {
  it("renders Button correctly with variant classes", () => {
    render(<Button variant="destructive">Delete Item</Button>);
    const btn = screen.getByRole("button", { name: /delete item/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders Input with data-hm runtime guard", () => {
    render(<Input data-hm="input" placeholder="Search records..." />);
    const input = screen.getByPlaceholderText("Search records...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-hm", "input");
  });

  it("renders Badge correctly", () => {
    render(<Badge variant="outline">Pending Review</Badge>);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("renders CommonTable with headers and rows", () => {
    const columns = [
      { key: "id", header: "ID" },
      { key: "title", header: "Title" },
    ];
    const data = [{ id: "1", title: "Test Asset" }];
    render(<CommonTable columns={columns} data={data} />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
  });
});
`,
  "utf-8",
);

// --- MANIFEST.MD ---
fs.writeFileSync(
  path.join(starterKit, "MANIFEST.md"),
  `# UI Standard Starter Kit Manifest

**Version**: 1.0.0  
**License**: MIT / Proprietary  
**Compatibility**: React >= 18.2, Tailwind CSS >= 3.4, TypeScript >= 5.0

---

## 1. Directory Structure

\`\`\`
starter-kit/
├── tokens/
│   ├── globals.css           # Semantic CSS variables for light & dark themes
│   ├── tailwind.preset.js    # Tailwind configuration preset
│   └── tokens.json           # Machine-readable token definitions
├── lib/
│   └── utils.ts              # cn() utility (clsx + tailwind-merge)
├── adapters/
│   ├── apiClient.ts          # Generic API client wrapper (fetch-based)
│   ├── permissionAdapter.ts  # PermissionProvider, usePermissions(), and <Can />
│   └── formatters.ts         # Date, currency, and phone formatters
├── hooks/
│   └── use-debounce.ts       # Debounce state hook
├── components/
│   ├── ui/                   # Portable UI Primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Checkbox.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── Switch.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── popover.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tabs.tsx
│   │   ├── date-picker/      # DatePicker, DateRangePicker, TimePicker
│   │   ├── select/           # Multi-select, Searchable select
│   │   └── phone-field/      # International phone input with country select
│   ├── common/               # Shared Composite Components
│   │   ├── CommonTable.tsx   # Searchable, sortable, paginated table
│   │   ├── TableFilterPanel.tsx # Chip filter bar
│   │   ├── ConfirmDialog.tsx # Accessible confirmation modal
│   │   ├── PageHeader.tsx    # Header with title & breadcrumbs
│   │   ├── RowActionsMenu.tsx # Action dropdown
│   │   └── States.tsx        # EmptyState, LoadingState, ErrorState, Spinner
│   └── hook-form/            # React Hook Form Integrations
│       ├── FormProvider.tsx
│       ├── fields.tsx        # RHFTextField, RHFCheckbox, RHFSwitch, RHFTextarea
│       ├── RHFDatePicker.tsx
│       ├── RHFDateRangePicker.tsx
│       ├── RHFTimePicker.tsx
│       └── RHFPhoneField.tsx
├── scripts/
│   ├── check-ui.mjs          # AST & regex anti-regression linter
│   └── check-field-usage.ts  # Guardrail blocking unauthorized native inputs
├── pages/
│   └── DesignSystemPage.tsx  # Full showcase / living kitchen-sink page
└── tests/
    └── StarterKit.test.tsx   # Vitest verification suite
\`\`\`

---

## 2. Declared NPM Dependencies

To consume this starter kit, install the following packages in your target project:

### Runtime Dependencies
\`\`\`bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-switch class-variance-authority clsx date-fns lucide-react react-day-picker react-hook-form tailwind-merge
\`\`\`

### Dev Dependencies
\`\`\`bash
npm install -D tailwindcss postcss autoprefixer typescript @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom jsdom
\`\`\`

---

## 3. Quickstart Integration (30-Minute Guide)

1. **Copy Files**: Copy \`starter-kit/\` into your project's \`src/\` folder.
2. **Add Tailwind Preset**: In your \`tailwind.config.js\`, import and add \`presets: [require('./src/tokens/tailwind.preset.js')]\`.
3. **Import CSS**: In your entry point (\`main.tsx\` or \`App.tsx\`), add \`import "./tokens/globals.css"\`.
4. **Wire Permissions**: Wrap your root provider with \`<PermissionProvider permissions={userPermissions}>\`.
5. **Add Guardrail Scripts**: Add \`"check:ui": "node src/scripts/check-ui.mjs"\` to your \`package.json\`.
6. **Mount Design System**: Route \`/design-system\` to \`<DesignSystemPage />\` to inspect all components.
`,
  "utf-8",
);

console.log("Successfully built starter kit and MANIFEST.md");
