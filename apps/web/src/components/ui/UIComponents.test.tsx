import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardHeader, CardContent } from "./card";
import { EmptyState, ErrorState, Spinner } from "../common/States";
import { StatCard } from "../common/StatCard";
import { Laptop } from "lucide-react";

describe("Web UI Components QA Suite", () => {
  describe("Button Component", () => {
    it("renders with primary variant and fires click handler", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole("button", { name: "Click Me" });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders disabled state and prevents click events", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Action
        </Button>,
      );

      const btn = screen.getByRole("button", { name: "Disabled Action" });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("renders loading state with spinner and disables button", () => {
      render(<Button loading>Saving Data</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("has zero accessibility violations (axe)", async () => {
      const { container } = render(
        <div>
          <Button variant="primary">Submit</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </div>,
      );
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe("Input Component", () => {
    it("renders input, accepts typing and triggers change", () => {
      const handleChange = vi.fn();
      render(
        <div>
          <label htmlFor="test-input">Test Label</label>
          <Input
            id="test-input"
            placeholder="Type here..."
            onChange={handleChange}
          />
        </div>,
      );

      const input = screen.getByPlaceholderText("Type here...");
      fireEvent.change(input, { target: { value: "Hello Antigravity" } });
      expect(input).toHaveValue("Hello Antigravity");
      expect(handleChange).toHaveBeenCalled();
    });

    it("renders disabled input properly", () => {
      render(<Input disabled placeholder="Disabled input" />);
      const input = screen.getByPlaceholderText("Disabled input");
      expect(input).toBeDisabled();
    });
  });

  describe("Card and StatCard Components", () => {
    it("renders card header and content structure", () => {
      render(
        <Card>
          <CardHeader>Header Info</CardHeader>
          <CardContent>Main Body Content</CardContent>
        </Card>,
      );
      expect(screen.getByText("Header Info")).toBeInTheDocument();
      expect(screen.getByText("Main Body Content")).toBeInTheDocument();
    });

    it("renders StatCard with value, label, icon and trend change", () => {
      render(
        <StatCard
          label="Total Fleet Assets"
          value={128}
          change={12.5}
          icon={<Laptop data-testid="laptop-icon" />}
        />,
      );
      expect(screen.getByText("Total Fleet Assets")).toBeInTheDocument();
      expect(screen.getByText("128")).toBeInTheDocument();
      expect(screen.getByText("12.5%")).toBeInTheDocument();
      expect(screen.getByTestId("laptop-icon")).toBeInTheDocument();
    });
  });

  describe("EmptyState and ErrorState Components", () => {
    it("renders EmptyState with title, description, and action button", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No hardware found"
          description="Try adjusting your active filters or add a new asset."
          action={<Button onClick={handleAction}>Add Hardware</Button>}
        />,
      );

      expect(screen.getByText("No hardware found")).toBeInTheDocument();
      expect(
        screen.getByText(/Try adjusting your active filters/),
      ).toBeInTheDocument();
      const actionBtn = screen.getByRole("button", { name: "Add Hardware" });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("renders ErrorState with alert role and retry action", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState message="Failed to load fleet data" retry={handleRetry} />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Failed to load fleet data")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("renders accessible Spinner status indicator", () => {
      render(<Spinner label="Loading records..." />);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Loading records...");
    });
  });
});
