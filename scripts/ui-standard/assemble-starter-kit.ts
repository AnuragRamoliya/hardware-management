import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const webSrc = path.join(repoRoot, "apps/web/src");
const starterKitDir = path.join(repoRoot, "docs/ui-standard/starter-kit");

// Helper to create dir if not exists
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Setup starter-kit directory structure
const dirs = [
  "tokens",
  "lib",
  "adapters",
  "components/ui",
  "components/common",
  "components/hook-form",
  "scripts",
  "pages",
];
dirs.forEach((d) => ensureDir(path.join(starterKitDir, d)));

// --- TOKENS ---
fs.writeFileSync(
  path.join(starterKitDir, "tokens/globals.css"),
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    --chart-1: 221.2 83.2% 53.3%;
    --chart-2: 160 84% 39%;
    --chart-3: 38 92% 50%;
    --chart-4: 0 84% 60%;
    --chart-5: 262 83% 58%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
`,
  "utf-8",
);

fs.writeFileSync(
  path.join(starterKitDir, "tokens/tailwind.preset.js"),
  `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};
`,
  "utf-8",
);

// Copy tokens.json
fs.copyFileSync(
  path.join(repoRoot, "docs/ui-standard/tokens.json"),
  path.join(starterKitDir, "tokens/tokens.json"),
);

// --- LIB / UTILS ---
fs.writeFileSync(
  path.join(starterKitDir, "lib/utils.ts"),
  `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
`,
  "utf-8",
);

// --- ADAPTERS ---
fs.writeFileSync(
  path.join(starterKitDir, "adapters/apiClient.ts"),
  `/**
 * Generic API Client Adapter Interface
 * Replace or bind this implementation to your backend framework (Axios, Fetch, TanStack Query).
 */
export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "/api";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = \`\${this.baseUrl}\${endpoint.startsWith("/") ? "" : "/"}\${endpoint}\`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || \`HTTP error \${res.status}\`);
    }

    return res.json() as Promise<T>;
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    let query = "";
    if (params) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
      query = \`?\${sp.toString()}\`;
    }
    return this.request<T>(\`\${endpoint}\${query}\`, { method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
`,
  "utf-8",
);

fs.writeFileSync(
  path.join(starterKitDir, "adapters/permissionAdapter.tsx"),
  `import React, { createContext, useContext, type ReactNode } from "react";

export interface PermissionContextValue {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const defaultContext: PermissionContextValue = {
  permissions: ["*"],
  hasPermission: () => true,
  hasRole: () => true,
};

const PermissionContext = createContext<PermissionContextValue>(defaultContext);

export function PermissionProvider({
  permissions = ["*"],
  roles = [],
  children,
}: {
  permissions?: string[];
  roles?: string[];
  children: ReactNode;
}) {
  const hasPermission = (perm: string): boolean => {
    if (permissions.includes("*")) return true;
    return permissions.includes(perm);
  };

  const hasRole = (role: string): boolean => {
    if (roles.includes("admin") || roles.includes("super_admin")) return true;
    return roles.includes(role);
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, hasRole }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextValue {
  return useContext(PermissionContext);
}

export function Can({
  perform,
  fallback = null,
  children,
}: {
  perform: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission } = usePermissions();
  if (hasPermission(perform)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
`,
  "utf-8",
);

fs.writeFileSync(
  path.join(starterKitDir, "adapters/formatters.ts"),
  `import { format, parseISO } from "date-fns";
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
      const dialCode = \`+\${getCountryCallingCode(code)}\`;
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
  defaultCountry: CountryCode = "IN"
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
  defaultCountry: CountryCode = "IN"
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

export function formatAsYouType(value: string, defaultCountry: CountryCode = "IN"): string {
  const ayt = new AsYouType(defaultCountry);
  return ayt.input(value);
}

export function formatDate(date: string | Date | null | undefined, pattern = "dd MMM yyyy"): string {
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

export function formatCurrency(amount: number | null | undefined, currency = "INR"): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
`,
  "utf-8",
);

console.log("Assembled tokens, lib, and adapters in starter-kit");
