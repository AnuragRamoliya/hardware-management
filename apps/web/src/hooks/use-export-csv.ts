export function useExportCsv<T extends object>() {
  return (
    rows: T[],
    columns: Array<{ id: string; label: string }>,
    filename: string,
  ) => {
    const sanitizeValue = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      let str = String(value);
      // Formula injection prevention
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return str.replaceAll('"', '""');
    };

    const escape = (value: unknown) => `"${sanitizeValue(value)}"`;

    const content = [
      columns.map((column) => escape(column.label)).join(","),
      ...rows.map((row) =>
        columns
          .map((column) =>
            escape(column.id in row ? Reflect.get(row, column.id) : ""),
          )
          .join(","),
      ),
    ].join("\r\n");

    // Prepend UTF-8 BOM so Excel opens UTF-8 encoded text properly
    const blob = new Blob(["\uFEFF" + content], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
}
