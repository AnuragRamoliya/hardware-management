import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableFilterPanel } from "./TableFilterPanel";
import type { FilterField } from "./types";

const fields: FilterField[] = [
  {
    key: "department_id",
    label: "Department",
    type: "select",
    options: [
      { value: "1", label: "Engineering" },
      { value: "2", label: "Operations" },
    ],
  },
  {
    key: "designation_id",
    label: "Designation",
    type: "select",
    dependsOn: "department_id",
    options: [{ value: "3", label: "Engineer" }],
  },
  {
    key: "joined_at",
    label: "Join date",
    type: "daterange",
  },
];

describe("TableFilterPanel", () => {
  it("toggles, applies, counts, and removes active filter chips", () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(
      <TableFilterPanel
        config={fields}
        value={{}}
        onApply={onApply}
        onReset={onReset}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Designation"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({
      department_id: "1",
      designation_id: "3",
    });
    rerender(
      <TableFilterPanel
        config={fields}
        value={{ department_id: "1", designation_id: "3" }}
        onApply={onApply}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole("button", { name: "Filters 2" })).toBeInTheDocument();
    expect(screen.getByText("Department: Engineering")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Department filter" }));
    expect(onApply).toHaveBeenLastCalledWith({ designation_id: "3" });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("clears dependent filters when their parent changes", () => {
    const onApply = vi.fn();
    render(
      <TableFilterPanel
        config={fields}
        value={{ department_id: "1", designation_id: "3" }}
        onApply={onApply}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters 2" }));
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ department_id: "2" });
  });

  it("opens a mobile bottom sheet with the same filter controls", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(
      <TableFilterPanel
        config={fields}
        value={{}}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
