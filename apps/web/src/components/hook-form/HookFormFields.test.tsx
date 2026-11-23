import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import FormProvider from "./form-provider";
import { RHFTextField, RHFPasswordField, RHFSwitch } from "./fields";
import { Button } from "../ui/button";

const testSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  notifications: yup.boolean().default(false),
});

type FormValues = yup.InferType<typeof testSchema>;

function TestFormWrapper({
  onSubmit,
}: {
  onSubmit: (data: FormValues) => void;
}) {
  const methods = useForm<FormValues>({
    resolver: yupResolver(testSchema),
    defaultValues: {
      username: "",
      password: "",
      notifications: false,
    },
  });

  return (
    <FormProvider methods={methods} onSubmit={methods.handleSubmit(onSubmit)}>
      <RHFTextField name="username" label="Username" required />
      <RHFPasswordField name="password" label="Password" required />
      <RHFSwitch name="notifications" label="Enable Notifications" />
      <Button type="submit">Save</Button>
    </FormProvider>
  );
}

describe("RHF Form Components & HookForm Integration Suite", () => {
  it("renders form fields with labels and initial states", () => {
    const { container } = render(<TestFormWrapper onSubmit={vi.fn()} />);

    expect(
      container.querySelector('input[name="username"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('input[name="password"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Enable Notifications")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("displays validation error messages when submitting empty required fields", async () => {
    const handleSubmit = vi.fn();
    render(<TestFormWrapper onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Username is required")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Password (is required|must be at least 8 characters)/,
        ),
      ).toBeInTheDocument();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("displays validation error when password length is below boundary (< 8)", async () => {
    const handleSubmit = vi.fn();
    const { container } = render(<TestFormWrapper onSubmit={handleSubmit} />);

    const userInput = container.querySelector('input[name="username"]')!;
    const passInput = container.querySelector('input[name="password"]')!;
    fireEvent.change(userInput, { target: { value: "johndoe" } });
    fireEvent.change(passInput, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeInTheDocument();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid form data correctly", async () => {
    const handleSubmit = vi.fn();
    const { container } = render(<TestFormWrapper onSubmit={handleSubmit} />);

    const userInput = container.querySelector('input[name="username"]')!;
    const passInput = container.querySelector('input[name="password"]')!;
    fireEvent.change(userInput, { target: { value: "alice_admin" } });
    fireEvent.change(passInput, { target: { value: "SecureSecret123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "alice_admin",
          password: "SecureSecret123!",
        }),
        expect.anything(),
      );
    });
  });
});
