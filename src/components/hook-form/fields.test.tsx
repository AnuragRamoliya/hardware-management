import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import FormProvider from "@/components/hook-form/form-provider";
import {
  RHFCheckbox,
  RHFNumberField,
  RHFPasswordField,
  RHFSearchInput,
  RHFSelect,
  RHFTextArea,
  RHFTextField,
} from "@/components/hook-form/fields";

function TestForm() {
  const methods = useForm({
    defaultValues: {
      name: "",
      password: "",
      count: "",
      notes: "",
      status: "",
      accept: false,
    },
  });
  return (
    <FormProvider
      methods={methods}
      onSubmit={methods.handleSubmit(() => undefined)}
    >
      <RHFTextField name="name" label="Name" required />
      <RHFPasswordField name="password" label="Password" required />
      <RHFNumberField name="count" label="Count" />
      <RHFTextArea name="notes" label="Notes" />
      <RHFSelect
        name="status"
        label="Status"
        options={[{ value: "active", label: "Active" }]}
      />
      <RHFCheckbox name="accept" label="Accept policy" />
      <button type="submit">Submit form</button>
    </FormProvider>
  );
}

describe("RHF field wrappers", () => {
  it("debounces search values without returning a non-cleanup value from its effect", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function SearchForm() {
      const methods = useForm({ defaultValues: { search: "" } });
      return (
        <FormProvider
          methods={methods}
          onSubmit={methods.handleSubmit(() => undefined)}
        >
          <RHFSearchInput name="search" label="Search" />
        </FormProvider>
      );
    }

    render(<SearchForm />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "employee" },
    });

    await waitFor(() =>
      expect(screen.getByRole("searchbox")).toHaveValue("employee"),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("destroy is not a function"),
      expect.anything(),
    );
    consoleError.mockRestore();
  });

  it("renders associated labels and allows keyboard-friendly field input", () => {
    render(<TestForm />);
    fireEvent.change(screen.getByLabelText("Name*"), {
      target: { value: "Casey" },
    });
    fireEvent.change(screen.getByLabelText("Count"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Needs a laptop" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Active" }));
    fireEvent.click(screen.getByLabelText("Accept policy"));
    expect(screen.getByLabelText("Name*")).toHaveValue("Casey");
    expect(screen.getByLabelText("Count")).toHaveValue(3);
    expect(screen.getByLabelText("Notes")).toHaveValue("Needs a laptop");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      "Active",
    );
    expect(screen.getByLabelText("Accept policy")).toBeChecked();
  });

  it("toggles password visibility accessibly", () => {
    render(<TestForm />);
    expect(screen.getByLabelText("Password*")).toHaveAttribute(
      "type",
      "password",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password*")).toHaveAttribute("type", "text");
  });
});
