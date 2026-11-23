export type OptionId = number | string;

export interface OptionsDto {
  search?: string;
  page?: number;
  limit?: number;
  ids?: OptionId[];
  filters?: Record<string, unknown>;
  cursor?: OptionsCursor;
}

export interface OptionsCursor {
  rank: number;
  label: string;
  id: OptionId;
}

export interface OptionItem {
  value: OptionId;
  label: string;
  subLabel?: string;
  meta: Record<string, unknown>;
  id: OptionId;
  name: string;
}

export interface OptionsResult {
  rows: OptionItem[];
  count: number;
  hasMore: boolean;
  page: number;
  nextCursor?: OptionsCursor;
}
