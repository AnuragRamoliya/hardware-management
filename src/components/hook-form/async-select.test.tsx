import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import FormProvider from "@/components/hook-form/form-provider";
import { RHFAsyncSelect } from "@/components/hook-form/fields";

const { mockLoadMore } = vi.hoisted(() => ({ mockLoadMore: vi.fn() }));

vi.mock("@/hooks/use-async-options", () => ({
  useAsyncOptions: () => ({
    data: {
      rows: [{ value: 9, label: "Engineering", subLabel: "ENG" }],
    },
    search: "",
    setSearch: vi.fn(),
    isLoading: false,
    isFetching: false,
    isError: false,
    hasMore: true,
    loadMore: mockLoadMore,
    selectedOptions: new Map(),
    hydrateIds: vi.fn(),
  }),
}));

function AsyncSelectForm({
  onSubmit,
}: {
  onSubmit: (data: { department_id: string }) => void;
}) {
  const methods = useForm({ defaultValues: { department_id: "" } });
  return (
    <FormProvider methods={methods} onSubmit={methods.handleSubmit(onSubmit)}>
      <RHFAsyncSelect
        name="department_id"
        label="Department"
        endpoint="department/options"
        required
      />
      <button type="submit">Save</button>
    </FormProvider>
  );
}

describe("RHFAsyncSelect", () => {
  it("submits the selected ID and displays the option label", async () => {
    const onSubmit = vi.fn();
    render(<AsyncSelectForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Engineering · ENG" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: "Engineering · ENG" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { department_id: "9" },
        expect.anything(),
      ),
    );
  });

  it("loads another options page when requested", async () => {
    render(<AsyncSelectForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more options" }));

    expect(mockLoadMore).toHaveBeenCalledOnce();
  });

  it("loads another options page when scrolling near the end", async () => {
    mockLoadMore.mockClear();
    render(<AsyncSelectForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Department" }));
    const listbox = screen.getByRole("listbox");
    Object.defineProperties(listbox, {
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 450 },
      clientHeight: { configurable: true, value: 100 },
    });
    fireEvent.scroll(listbox);

    expect(mockLoadMore).toHaveBeenCalledOnce();
  });
});
