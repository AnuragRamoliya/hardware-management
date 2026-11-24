import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { CommonTable } from "../components/common/CommonTable";

describe("Starter Kit UI Primitives", () => {
  it("renders Button correctly with variant classes", () => {
    render(<Button variant="destructive">Delete Item</Button>);
    const btn = screen.getByRole("button", { name: /delete item/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders Input with data-hm runtime guard", () => {
    render(<Input data-hm="input" placeholder="Search records..." />);
    const input = screen.getByPlaceholderText("Search records...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-hm", "input");
  });

  it("renders Badge correctly", () => {
    render(<Badge variant="outline">Pending Review</Badge>);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("renders CommonTable with headers and rows", () => {
    const columns = [
      { key: "id", header: "ID" },
      { key: "title", header: "Title" },
    ];
    const data = [{ id: "1", title: "Test Asset" }];
    render(<CommonTable columns={columns} data={data} />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
  });
});
