import * as yup from "yup";
import { CREDENTIAL_CATEGORIES } from "@hm/shared";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const credentialTypeSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required(FORM_VALIDATION.REQUIRED)
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  category: yup
    .string()
    .oneOf([...CREDENTIAL_CATEGORIES], "Please select a valid category")
    .required(FORM_VALIDATION.REQUIRED),
  expiry_days: yup
    .number()
    .transform((val, orig) =>
      orig === "" || orig === null || isNaN(val) ? null : val,
    )
    .nullable()
    .min(1, "Expiry days must be at least 1"),
  min_length: yup
    .number()
    .typeError("Minimum length must be a number")
    .required(FORM_VALIDATION.REQUIRED)
    .min(8, "Minimum length must be at least 8")
    .max(64, "Minimum length cannot exceed 64"),
  require_complexity: yup.boolean().default(true),
  requires_approval: yup.boolean().default(true),
  allow_employee_submit: yup.boolean().default(true),
  notes: yup
    .string()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
});

export type CredentialTypeFormValues = yup.InferType<
  typeof credentialTypeSchema
>;
