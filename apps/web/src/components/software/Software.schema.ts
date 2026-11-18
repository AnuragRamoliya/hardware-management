import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const softwareFormSchema = yup.object({
  name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  category: yup.string().required(FORM_VALIDATION.REQUIRED),
  license_type: yup.string().required(FORM_VALIDATION.REQUIRED),
  vendor_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" || val == null ? null : Number(val))),
  cost: yup
    .number()
    .nullable()
    .transform((val, orig) =>
      orig === "" || orig == null ? null : Number(val),
    )
    .min(0, "Cost must be a positive number"),
  billing_cycle: yup
    .string()
    .nullable()
    .transform((val) => (val ? val : null)),
  renewal_date: yup
    .string()
    .nullable()
    .transform((val) => (val ? val : null)),
  notes: yup
    .string()
    .nullable()
    .transform((val) => (val ? val : null)),
});

export type SoftwareFormValues = yup.InferType<typeof softwareFormSchema>;
