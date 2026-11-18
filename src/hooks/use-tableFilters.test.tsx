import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useTableFilters } from "./use-tableFilters";

function Harness() {
  const { filters, writeFilters } = useTableFilters();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="filters">{JSON.stringify(filters)}</output>
      <output data-testid="search">{location.search}</output>
      <button onClick={() => writeFilters({ location_id: ["2", "3"] })}>Apply</button>
      <button onClick={() => writeFilters({})}>Reset</button>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

describe("useTableFilters", () => {
  it("reads filters from the URL and writes/clears them while preserving other query values", () => {
    render(
      <MemoryRouter initialEntries={["/employees?page=2"]}>
        <Harness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByTestId("filters")).toHaveTextContent('{"location_id":["2","3"]}');
    expect(screen.getByTestId("search")).toHaveTextContent("?page=2&filters=%7B%22location_id%22%3A%5B%222%22%2C%223%22%5D%7D");

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("filters")).toHaveTextContent("{}");
    expect(screen.getByTestId("search")).toHaveTextContent("?page=2");
  });

  it("restores filters on browser back navigation", () => {
    render(
      <MemoryRouter initialEntries={["/employees?filters=%7B%22location_id%22%3A%5B%222%22%5D%7D"]}>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTestId("filters")).toHaveTextContent('{"location_id":["2"]}');
  });
});
