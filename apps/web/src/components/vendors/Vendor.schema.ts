import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const vendorFormSchema = yup.object({
  name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  contact_name: yup.string().trim().nullable().default(""),
  email: yup
    .string()
    .trim()
    .email(FORM_VALIDATION.EMAIL)
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  phone: yup.string().trim().nullable().default(""),
  address: yup.string().trim().nullable().default(""),
  status: yup
    .mixed<string | number>()
    .default(1)
    .required(FORM_VALIDATION.REQUIRED),
});

export type VendorFormValues = yup.InferType<typeof vendorFormSchema>;
