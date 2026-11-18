import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const assetFormSchema = yup.object({
  asset_tag: yup.string().trim().nullable(),
  serial_no: yup.string().trim().nullable(),
  brand: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  model: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  category_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  vendor_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  location_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  parent_asset_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  condition: yup
    .string()
    .oneOf(["new", "good", "fair", "poor"])
    .default("good")
    .required(FORM_VALIDATION.REQUIRED),
  purchase_date: yup.string().nullable(),
  purchase_cost: yup
    .number()
    .nullable()
    .transform((val, orig) =>
      orig === "" || orig === null || isNaN(val) ? null : val,
    ),
  warranty_start: yup.string().nullable(),
  warranty_end: yup
    .string()
    .nullable()
    .test("warranty-order", FORM_VALIDATION.DATE_ORDER, function (value) {
      const { warranty_start } = this.parent;
      if (!warranty_start || !value) return true;
      return new Date(value).getTime() >= new Date(warranty_start).getTime();
    }),
  notes: yup.string().trim().nullable(),
  specs: yup
    .array()
    .of(
      yup.object({
        key: yup.string().required(),
        value: yup.string().required(),
      }),
    )
    .default([]),
});

export type AssetFormValues = yup.InferType<typeof assetFormSchema>;
