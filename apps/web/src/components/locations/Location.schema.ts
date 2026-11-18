import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const locationFormSchema = yup.object({
  name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  address: yup.string().trim().nullable().default(""),
  status: yup
    .mixed<string | number>()
    .default(1)
    .required(FORM_VALIDATION.REQUIRED),
});

export type LocationFormValues = yup.InferType<typeof locationFormSchema>;
