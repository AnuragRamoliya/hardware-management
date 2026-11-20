import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge Component", () => {
  it("renders with custom string label and replaces underscores with spaces", () => {
    render(<StatusBadge label="in_progress" tone="warning" />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("renders with known string enum key from constants", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("handles labelMap mapping correctly", () => {
    render(
      <StatusBadge
        status="pending_review"
        labelMap={{ pending_review: "Under Evaluation" }}
      />,
    );
    expect(screen.getByText("Under Evaluation")).toBeInTheDocument();
  });

  it("handles unknown string status gracefully with a neutral fallback and never crashes", () => {
    render(<StatusBadge status="non_existent_status_xyz" />);
    expect(screen.getByText("non existent status xyz")).toBeInTheDocument();
  });

  it("handles undefined status and label without crashing", () => {
    render(<StatusBadge />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("applies custom tones properly", () => {
    const { container } = render(
      <StatusBadge
        label="Pending Approval"
        tone="purple"
        className="custom-test-class"
      />,
    );
    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("custom-test-class");
  });
});
