import { TableSelectFilter } from "./TableSelectFilter";

export interface SelectFilterProps {
  endpoint: string;
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  className?: string;
}

export function SelectFilter({
  endpoint,
  value,
  onChange,
  placeholder,
}: SelectFilterProps) {
  const resource = endpoint.replace(/\/options$/, "");
  return (
    <TableSelectFilter
      config={{
        name: "select",
        label: placeholder || "Select...",
        optionsResource: resource,
      }}
      value={value}
      onChange={(val) => {
        if (Array.isArray(val)) {
          onChange(val[0] ? String(val[0]) : undefined);
        } else {
          onChange(val != null && val !== "" ? String(val) : undefined);
        }
      }}
    />
  );
}
