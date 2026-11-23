import { useCallback, useEffect, useRef, useState } from "react";
import type { ListQuery } from "@/types";
import { useTableFilters } from "./use-tableFilters";

export function useTableState(defaultItemsPerPage = 10) {
  const { filters: urlFilters, writeFilters } = useTableFilters();
  const writeFiltersRef = useRef(writeFilters);
  const [tableState, setState] = useState<ListQuery>({
    currentPage: 1,
    itemsPerPage: defaultItemsPerPage,
    sortBy: [],
    filters: urlFilters,
    general_search: "",
  });

  useEffect(() => {
    writeFiltersRef.current = writeFilters;
  }, [writeFilters]);

  useEffect(() => {
    setState((previous) =>
      JSON.stringify(previous.filters) === JSON.stringify(urlFilters)
        ? previous
        : { ...previous, currentPage: 1, filters: urlFilters },
    );
  }, [urlFilters]);

  const setTableState = useCallback((updates: Partial<ListQuery>) => {
    if (Object.hasOwn(updates, "filters")) {
      writeFiltersRef.current(updates.filters ?? {});
    }
    setState((previous) => ({ ...previous, ...updates }));
  }, []);
  const resetTableState = useCallback(() => {
    writeFiltersRef.current({});
    setState({
      currentPage: 1,
      itemsPerPage: defaultItemsPerPage,
      sortBy: [],
      filters: {},
      general_search: "",
    });
  }, [defaultItemsPerPage]);
  return { tableState, setTableState, resetTableState };
}
