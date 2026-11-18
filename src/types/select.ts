export type SelectValue = string | number | null;

export interface MultiValue {
  type: "multi";
  value: (string | number)[];
}

export interface SingleValue {
  type: "single";
  value: string | number | null;
}

export type SelectFormValue = SelectValue | MultiValue;

export interface Badge {
  text: string;
  tone: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}

export interface Avatar {
  src?: string;
  alt?: string;
  className?: string;
}

export interface OptionMeta {
  disabled?: boolean;
  badge?: Badge;
  avatar?: Avatar;
}

export interface OptionItem {
  value: SelectValue;
  label: string;
  subLabel?: string;
  /** Optional avatar/image URL */
  avatar?: string;
  /** Optional status badge */
  badge?: {
    text: string;
    tone:
      "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  };
  /** Optional disabled state */
  disabled?: boolean;
  /** Additional meta data */
  meta?: Record<string, unknown>;
}

export interface AsyncOptionsProvider<Option = OptionItem> {
  /** Fetch options for a given search term and page */
  fetchOptions: (
    search: string,
    page: number,
    limit: number,
    filters?: Record<string, unknown>,
  ) => Promise<{
    rows: Option[];
    count: number;
    hasMore: boolean;
    page: number;
  }>;
  /** Hydrate specific IDs (for edit form label display) */
  hydrateIds: (ids: SelectValue[]) => Promise<OptionItem[]>;
  /** Cancel in-flight requests */
  cancel: () => void;
}

/** Provider props for async select with server-side search */
export interface AsyncSelectProviderProps {
  /** Resource name (used for endpoint) */
  resource: string;
  /** Optional custom filters */
  filters?: Record<string, unknown>;
  /** Default page size */
  pageSize?: number;
  /** Query key for react-query */
  queryKey?: string[];
}
