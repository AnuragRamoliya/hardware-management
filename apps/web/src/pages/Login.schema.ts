import * as yup from "yup";
import { emailValidator, FORM_VALIDATION } from "@/utils/form-validation";

export type LoginFormValues = { email: string; password: string };

export const loginSchema: yup.ObjectSchema<LoginFormValues> = yup.object({
  email: emailValidator(),
  password: yup.string().required(FORM_VALIDATION.REQUIRED),
});
