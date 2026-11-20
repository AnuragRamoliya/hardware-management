import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Chart } from "./Chart";

describe("Chart Component", () => {
  const sampleData = [
    { name: "Available", value: 12 },
    { name: "Assigned", value: 28 },
    { name: "In Repair", value: 4 },
  ];

  it("renders title, description and toggle button", () => {
    render(
      <Chart
        title="Hardware Distribution"
        description="Asset deployment by status"
        data={sampleData}
      />,
    );

    expect(screen.getByText("Hardware Distribution")).toBeInTheDocument();
    expect(screen.getByText("Asset deployment by status")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /view hardware distribution as data table/i,
      }),
    ).toBeInTheDocument();
  });

  it("toggles table view alternative with accessible tabular data", () => {
    render(<Chart title="Hardware Distribution" data={sampleData} />);

    const toggleBtn = screen.getByRole("button", {
      name: /view hardware distribution as data table/i,
    });
    fireEvent.click(toggleBtn);

    // Should now show table view
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();

    // Toggle back to chart
    fireEvent.click(
      screen.getByRole("button", {
        name: /view hardware distribution as chart/i,
      }),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders empty state message when data array is empty", () => {
    render(<Chart title="Empty Metrics" data={[]} />);

    expect(screen.getByText("No chart data available")).toBeInTheDocument();
  });
});
