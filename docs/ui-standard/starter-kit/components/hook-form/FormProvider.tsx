import React, { type FormHTMLAttributes, type ReactNode } from "react";
import {
  FormProvider as RHFProvider,
  type UseFormReturn,
  type FieldValues,
} from "react-hook-form";

export function FormProvider<T extends FieldValues>({
  children,
  methods,
  onSubmit,
  ...props
}: {
  children: ReactNode;
  methods: UseFormReturn<T>;
  onSubmit?: () => void;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit">) {
  return (
    <RHFProvider {...methods}>
      <form onSubmit={onSubmit} {...props}>
        {children}
      </form>
    </RHFProvider>
  );
}
export default FormProvider;
