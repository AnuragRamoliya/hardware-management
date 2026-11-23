import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  parseDateString,
  formatDateString,
  formatDateDisplay,
  formatDateRangeDisplay,
  DATE_PRESETS,
} from "./date-utils";
import { DatePicker } from "./DatePicker";
import { DateRangePicker } from "./DateRangePicker";
import { TimePicker } from "./TimePicker";
import { DateTimePicker } from "./DateTimePicker";

describe("Date Utilities & Timezone Contract", () => {
  it("parses YYYY-MM-DD strings into local Date with zero timezone drift", () => {
    const d1 = parseDateString("2026-11-23");
    expect(d1).toBeDefined();
    expect(d1?.getFullYear()).toBe(2026);
    expect(d1?.getMonth()).toBe(10); // 0-indexed: 10 = November
    expect(d1?.getDate()).toBe(23);

    // Leap day test
    const leap = parseDateString("2024-02-29");
    expect(leap?.getFullYear()).toBe(2024);
    expect(leap?.getMonth()).toBe(1); // February
    expect(leap?.getDate()).toBe(29);

    // Non-leap year month boundary
    const febEnd = parseDateString("2025-02-28");
    expect(febEnd?.getDate()).toBe(28);

    // 30-day month end
    const aprEnd = parseDateString("2026-04-30");
    expect(aprEnd?.getDate()).toBe(30);

    // 31-day month end
    const decEnd = parseDateString("2026-12-31");
    expect(decEnd?.getDate()).toBe(31);
  });

  it("formats Date to YYYY-MM-DD strictly according to local calendar values", () => {
    const date = new Date(2026, 10, 23); // Nov 23, 2026
    expect(formatDateString(date)).toBe("2026-11-23");

    const leap = new Date(2024, 1, 29); // Feb 29, 2024
    expect(formatDateString(leap)).toBe("2024-02-29");
  });

  it("formats user-facing display strings", () => {
    expect(formatDateDisplay("2026-11-23")).toBe("Nov 23, 2026");
    expect(formatDateDisplay(null)).toBe("");
    expect(
      formatDateRangeDisplay({ from: "2026-11-01", to: "2026-11-23" }),
    ).toBe("Nov 01, 2026 – Nov 23, 2026");
  });

  it("computes accurate business presets including Indian Financial Year", () => {
    const ref = new Date(2026, 10, 23); // Nov 23, 2026

    const today = DATE_PRESETS.find((p) => p.id === "today")?.getRange(ref);
    expect(today).toEqual({ from: "2026-11-23", to: "2026-11-23" });

    const yest = DATE_PRESETS.find((p) => p.id === "yesterday")?.getRange(ref);
    expect(yest).toEqual({ from: "2026-11-22", to: "2026-11-22" });

    const l7 = DATE_PRESETS.find((p) => p.id === "last-7d")?.getRange(ref);
    expect(l7).toEqual({ from: "2026-11-17", to: "2026-11-23" });

    const l30 = DATE_PRESETS.find((p) => p.id === "last-30d")?.getRange(ref);
    expect(l30).toEqual({ from: "2026-10-25", to: "2026-11-23" });

    const thisMonth = DATE_PRESETS.find((p) => p.id === "this-month")?.getRange(
      ref,
    );
    expect(thisMonth).toEqual({ from: "2026-11-01", to: "2026-11-30" });

    const thisQ = DATE_PRESETS.find((p) => p.id === "this-quarter")?.getRange(
      ref,
    );
    expect(thisQ).toEqual({ from: "2026-10-01", to: "2026-12-31" });

    // Indian FY: Nov 2026 falls in FY 2026-2027 (Apr 1, 2026 - Mar 31, 2027)
    const thisFY = DATE_PRESETS.find((p) => p.id === "this-fy")?.getRange(ref);
    expect(thisFY).toEqual({ from: "2026-04-01", to: "2027-03-31" });

    // January test for FY: Jan 15, 2027 falls in FY 2026-2027
    const janRef = new Date(2027, 0, 15);
    const janFY = DATE_PRESETS.find((p) => p.id === "this-fy")?.getRange(
      janRef,
    );
    expect(janFY).toEqual({ from: "2026-04-01", to: "2027-03-31" });
  });
});

describe("DatePicker Component", () => {
  it("renders with data-hm='date' and displays formatted date", () => {
    const { container } = render(<DatePicker value="2026-11-23" />);
    const trigger = container.querySelector('[data-hm="date"]');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Nov 23, 2026")).toBeInTheDocument();
  });

  it("opens popover dialog on click and displays calendar with quick actions", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DatePicker value="2026-11-23" onChange={onChange} />,
    );

    const trigger = container.querySelector('[data-hm="date"]') as HTMLElement;
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /Choose date/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yesterday" }),
    ).toBeInTheDocument();

    // Clicking Today triggers change
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith(formatDateString(new Date()));
  });

  it("supports clearing the selected date", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-11-23" onChange={onChange} />);

    const clearBtn = screen.getByRole("button", { name: /Clear date/i });
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("respects disabled state and cannot open", () => {
    const { container } = render(<DatePicker disabled value="2026-11-23" />);
    const trigger = container.querySelector('[data-hm="date"]');
    expect(trigger).toBeDisabled();

    fireEvent.click(trigger!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DateRangePicker Component", () => {
  it("renders with data-hm='date-range' and displays formatted range", () => {
    const { container } = render(
      <DateRangePicker value={{ from: "2026-11-01", to: "2026-11-23" }} />,
    );
    const trigger = container.querySelector('[data-hm="date-range"]');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Nov 01, 2026 – Nov 23, 2026")).toBeInTheDocument();
  });

  it("opens popover and applies preset on click", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateRangePicker
        value={{ from: "2026-11-01", to: "2026-11-23" }}
        onChange={onChange}
      />,
    );

    const trigger = container.querySelector(
      '[data-hm="date-range"]',
    ) as HTMLElement;
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /Choose date range/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Last 7 Days" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Last 7 Days" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("clears range on clear button click", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{ from: "2026-11-01", to: "2026-11-23" }}
        onChange={onChange}
      />,
    );

    const clearBtn = screen.getByRole("button", { name: /Clear date range/i });
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith({ from: "", to: "" });
  });
});

describe("TimePicker Component", () => {
  it("renders with data-hm='time' and formats 12-hour display", () => {
    const { container } = render(<TimePicker value="14:30" />);
    const trigger = container.querySelector('[data-hm="time"]');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("02:30 PM")).toBeInTheDocument();
  });

  it("opens time popover and updates hour / minute / period", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimePicker value="14:30" onChange={onChange} />,
    );

    const trigger = container.querySelector('[data-hm="time"]') as HTMLElement;
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /Choose time/i }),
    ).toBeInTheDocument();

    // Toggle to AM
    const amBtn = screen.getByRole("button", { name: "AM" });
    fireEvent.click(amBtn);

    expect(onChange).toHaveBeenCalledWith("02:30");
  });
});

describe("DateTimePicker Component", () => {
  it("renders with data-hm='datetime' and formats combined date and time", () => {
    const { container } = render(
      <DateTimePicker value="2026-11-23T14:30:00" />,
    );
    const trigger = container.querySelector('[data-hm="datetime"]');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText(/Nov 23, 2026, 02:30 PM/i)).toBeInTheDocument();
  });

  it("emits ISO timestamp on time change", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateTimePicker value="2026-11-23T14:30:00" onChange={onChange} />,
    );

    const trigger = container.querySelector(
      '[data-hm="datetime"]',
    ) as HTMLElement;
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /Choose date and time/i }),
    ).toBeInTheDocument();

    const amBtn = screen.getByRole("button", { name: "AM" });
    fireEvent.click(amBtn);

    expect(onChange).toHaveBeenCalledWith("2026-11-23T02:30:00");
  });
});
