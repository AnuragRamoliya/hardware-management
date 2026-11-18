import type { FormHTMLAttributes, ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { FormProvider as Provider } from "react-hook-form";

export default function FormProvider<T extends FieldValues>({
  methods,
  children,
  ...props
}: {
  methods: UseFormReturn<T>;
  children: ReactNode;
} & FormHTMLAttributes<HTMLFormElement>) {
  return (
    <Provider {...methods}>
      <form noValidate {...props}>
        {children}
      </form>
    </Provider>
  );
}
