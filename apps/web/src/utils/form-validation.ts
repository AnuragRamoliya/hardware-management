import * as yup from "yup";

export const FORM_VALIDATION = {
  REQUIRED: "This field is required.",
  EMAIL: "Enter a valid email address.",
  PHONE: "Enter a valid phone number.",
  POSITIVE_NUMBER: "Enter a number greater than zero.",
  DATE_ORDER: "The end date must be on or after the start date.",
  PASSWORD_MINIMUM: "Use at least 12 characters.",
  PASSWORD_MISMATCH: "Passwords do not match.",
} as const;

export const emailValidator = () =>
  yup
    .string()
    .trim()
    .email(FORM_VALIDATION.EMAIL)
    .required(FORM_VALIDATION.REQUIRED);
export const phoneValidator = () =>
  yup
    .string()
    .trim()
    .matches(/^\+?[0-9 ()-]{7,20}$/, {
      message: FORM_VALIDATION.PHONE,
      excludeEmptyString: true,
    });
export const positiveNumberValidator = () =>
  yup
    .number()
    .typeError(FORM_VALIDATION.POSITIVE_NUMBER)
    .positive(FORM_VALIDATION.POSITIVE_NUMBER);
export const dateOrderValidator = <T extends yup.AnyObject>(
  schema: yup.ObjectSchema<T>,
  from: keyof T & string,
  to: keyof T & string,
) =>
  schema.test("date-order", FORM_VALIDATION.DATE_ORDER, (value) => {
    const start = value?.[from];
    const end = value?.[to];
    return (
      !start ||
      !end ||
      new Date(String(end)).getTime() >= new Date(String(start)).getTime()
    );
  });
