import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const licenseFormSchema = yup.object({
  license_key: yup
    .string()
    .trim()
    .nullable()
    .transform((val) => (val ? val : null)),
  seats_total: yup
    .number()
    .typeError(FORM_VALIDATION.REQUIRED)
    .required(FORM_VALIDATION.REQUIRED)
    .min(1, "Total seats must be at least 1")
    .integer("Total seats must be a whole number"),
  purchase_date: yup
    .string()
    .nullable()
    .transform((val) => (val ? val : null)),
  expiry_date: yup
    .string()
    .nullable()
    .transform((val) => (val ? val : null)),
});

export type LicenseFormValues = yup.InferType<typeof licenseFormSchema>;
