export type FilterOption = { value: string | number; label: string };
export type FilterRange = { from?: string | number; to?: string | number };
export type FilterValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | FilterRange
  | null
  | undefined;
export type FilterValues = Record<string, FilterValue>;

type FilterBase = {
  key: string;
  label: string;
  placeholder?: string;
  width?: 1 | 2 | 3 | 4;
  dependsOn?: string;
};

export type FilterField =
  | (FilterBase & { type: "text" | "date" | "number" | "boolean" })
  | (FilterBase & {
      type: "select" | "multiselect" | "status";
      options: ReadonlyArray<FilterOption>;
    })
  | (FilterBase & {
      type: "async-select";
      endpoint: string;
      multiple?: boolean;
    })
  | (FilterBase & { type: "daterange" | "numberrange" });
