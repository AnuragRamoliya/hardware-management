export function useExportCsv<T extends object>() {
  return (
    rows: T[],
    columns: Array<{ id: string; label: string }>,
    filename: string,
  ) => {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = [
      columns.map((column) => escape(column.label)).join(","),
      ...rows.map((row) =>
        columns
          .map((column) =>
            escape(column.id in row ? Reflect.get(row, column.id) : ""),
          )
          .join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
}
