import { format, parseISO } from "date-fns";
import {
  parsePhoneNumberFromString,
  AsYouType,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

export interface CountryInfo {
  code: CountryCode;
  name: string;
  dialCode: string;
}

const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  AE: "United Arab Emirates",
  SG: "Singapore",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  NL: "Netherlands",
  CH: "Switzerland",
  SE: "Sweden",
  NZ: "New Zealand",
  IE: "Ireland",
  IT: "Italy",
  ES: "Spain",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  MY: "Malaysia",
  PH: "Philippines",
  ID: "Indonesia",
};

export const SUPPORTED_COUNTRIES: CountryInfo[] = getCountries()
  .map((code) => {
    try {
      const dialCode = `+${getCountryCallingCode(code)}`;
      return {
        code,
        name: COUNTRY_NAMES[code] || code,
        dialCode,
      };
    } catch {
      return null;
    }
  })
  .filter((c): c is CountryInfo => c !== null);

export function formatPhoneNumber(
  value: string | null | undefined,
  mode: "national" | "international" | "e164" = "international",
  defaultCountry: CountryCode = "IN",
): string {
  if (!value) return "-";
  try {
    const pn = parsePhoneNumberFromString(value, defaultCountry);
    if (!pn) return value;
    if (mode === "e164") return pn.number;
    if (mode === "national") return pn.formatNational();
    return pn.formatInternational();
  } catch {
    return value;
  }
}

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  e164?: string;
  country?: CountryCode;
  nationalNumber?: string;
  formattedNational?: string;
  formattedInternational?: string;
}

export function validatePhoneNumber(
  value: string | null | undefined,
  defaultCountry: CountryCode = "IN",
): PhoneValidationResult {
  if (!value || typeof value !== "string" || !value.trim()) {
    return { valid: false, error: "Phone number is required" };
  }

  const clean = value.trim();

  try {
    let parsed = parsePhoneNumberFromString(clean);
    if (!parsed) {
      parsed = parsePhoneNumberFromString(clean, defaultCountry);
    }

    if (!parsed || !parsed.isValid()) {
      return {
        valid: false,
        error: "Invalid phone number format",
      };
    }

    return {
      valid: true,
      e164: parsed.format("E.164"),
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      formattedNational: parsed.formatNational(),
      formattedInternational: parsed.formatInternational(),
    };
  } catch (err) {
    return {
      valid: false,
      error: "Error validating phone number",
    };
  }
}

export function formatAsYouType(
  value: string,
  defaultCountry: CountryCode = "IN",
): string {
  const ayt = new AsYouType(defaultCountry);
  return ayt.input(value);
}

export function formatDate(
  date: string | Date | null | undefined,
  pattern = "dd MMM yyyy",
): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern);
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "dd MMM yyyy, HH:mm");
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR",
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
