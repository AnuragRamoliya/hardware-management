import {
  parsePhoneNumberFromString,
  AsYouType,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  dialCode: string;
}

// Common country names map for clean readable search and display
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
  TH: "Thailand",
  VN: "Vietnam",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  OM: "Oman",
  BH: "Bahrain",
};

export const SUPPORTED_COUNTRIES: CountryInfo[] = getCountries()
  .map((code) => {
    try {
      const dialCode = `+${getCountryCallingCode(code)}`;
      const name = COUNTRY_NAMES[code] || code;
      return { code, name, dialCode };
    } catch {
      return null;
    }
  })
  .filter((c): c is CountryInfo => c !== null)
  .sort((a, b) => {
    // Put India (+91) at the top as requested default
    if (a.code === "IN") return -1;
    if (b.code === "IN") return 1;
    return a.name.localeCompare(b.name);
  });

export interface PhoneValidationResult {
  valid: boolean;
  e164?: string;
  country?: CountryCode;
  nationalNumber?: string;
  formattedNational?: string;
  formattedInternational?: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers to E.164.
 * Accepts E.164 strings (+91...) or local national numbers parsed using defaultCountry (default 'IN').
 */
export function validatePhoneNumber(
  value: string | null | undefined,
  defaultCountry: CountryCode = "IN",
): PhoneValidationResult {
  if (!value || typeof value !== "string" || !value.trim()) {
    return { valid: false, error: "Phone number is required" };
  }

  const clean = value.trim();

  try {
    // Try parsing as-is (works if it starts with + or 00)
    let parsed = parsePhoneNumberFromString(clean);

    // If not parseable with international prefix, try parsing with default country
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
      error: (err as Error).message || "Invalid phone number",
    };
  }
}

/**
 * Formats a phone number in national or international style.
 */
export function formatPhoneNumber(
  value: string | null | undefined,
  mode: "national" | "international" | "e164" = "international",
  defaultCountry: CountryCode = "IN",
): string {
  if (!value) return "";
  const result = validatePhoneNumber(value, defaultCountry);
  if (!result.valid) return value;

  if (mode === "national") return result.formattedNational || value;
  if (mode === "e164") return result.e164 || value;
  return result.formattedInternational || result.e164 || value;
}

/**
 * As-you-type formatting for interactive phone fields.
 */
export function formatAsYouType(
  value: string,
  country: CountryCode = "IN",
): string {
  const formatter = new AsYouType(country);
  return formatter.input(value);
}
