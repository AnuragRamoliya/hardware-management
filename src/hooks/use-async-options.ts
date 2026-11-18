import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { callApi } from "@/api/callApi";
import type { OptionItem } from "@/types/select";
import { useDebounce } from "./use-debounce";
import { useCallback, useRef, useEffect, useMemo, useState } from "react";

export function useAsyncOptions({
  endpoint,
  filters,
  pageSize = 30,
  enabled = true,
}: {
  endpoint: string;
  filters?: Record<string, unknown>;
  pageSize?: number;
  enabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const hydrationInFlightRef = useRef(new Set<string>());
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      return !Array.isArray(value) || value.length > 0;
    }),
  );

  const query = useInfiniteQuery({
    queryKey: [
      "options",
      endpoint,
      JSON.stringify(normalizedFilters),
      debouncedSearch,
      pageSize,
    ],
    initialPageParam: null as { rank: number; label: string; id: number | string } | null,
    queryFn: async ({ pageParam, signal }) => {
      const result = await callApi<{
        rows: OptionItem[];
        count: number;
        hasMore: boolean;
        page: number;
        nextCursor?: { rank: number; label: string; id: number | string };
      }>({
        url: endpoint,
        method: "POST",
        body: {
          search: debouncedSearch || undefined,
          cursor: pageParam ?? undefined,
          limit: pageSize,
          filters: normalizedFilters,
        },
        retried: false,
        signal,
      });

      if (!result.ok || !result.data) {
        throw new Error(result.message || "Failed to fetch options");
      }

      return result.data;
    },
    enabled,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
  const data = useMemo(
    () =>
      query.data
        ? {
            ...query.data.pages[query.data.pages.length - 1],
            rows: query.data.pages.flatMap((page) => page.rows),
          }
        : undefined,
    [query.data],
  );

  const [selectedOptions, setSelectedOptions] = useState<
    Map<string, OptionItem>
  >(new Map());

  // Hydrate IDs that exist in form value but not in loaded pages
  const hydrateIds = useCallback(
    async (ids: string | number | Array<string | number>) => {
      const idList = Array.isArray(ids) ? ids : [ids];
      if (idList.length === 0) return;

      const uniqueIds = [...new Set(idList.map(String))].filter(
        (id) => !hydrationInFlightRef.current.has(id),
      );
      if (uniqueIds.length === 0) return;
      uniqueIds.forEach((id) => hydrationInFlightRef.current.add(id));

      try {
      const result = await callApi<{
        rows: OptionItem[];
        count: number;
        hasMore: boolean;
        page: number;
      }>({
        url: endpoint,
        method: "POST",
        body: {
          ids: uniqueIds,
          page: 1,
          limit: 200,
        },
        retried: false,
      });

      if (result.ok && result.data) {
        const hydratedRows = result.data.rows;
        setSelectedOptions((previous) => {
          const options = new Map(previous);
          hydratedRows.forEach((option) =>
            options.set(String(option.value), option),
          );
          return options;
        });
      }
      } finally {
        uniqueIds.forEach((id) => hydrationInFlightRef.current.delete(id));
      }
    },
    [endpoint],
  );

  // Update selected options when search or pages change
  useEffect(() => {
    // Filter out loaded options that don't match search
    // and keep separately hydrated options
    setSelectedOptions((prev) => {
      const loadedOptions = new Map(
        (data?.rows || []).map((opt) => [String(opt.value), opt]),
      );
      // Keep only hydrated options that weren't loaded, plus any new ones
      const result = new Map<string, OptionItem>();
      for (const [key, val] of prev) {
        if (!loadedOptions.has(key)) {
          result.set(key, val);
        }
      }
      if (
        result.size === prev.size &&
        [...result].every(([key, value]) => prev.get(key) === value)
      ) {
        return prev;
      }
      return result;
    });
  }, [data?.rows]);

  return {
    data,
    search,
    setSearch,
    debouncedSearch,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    selectedOptions,
    hydrateIds,
  };
}
