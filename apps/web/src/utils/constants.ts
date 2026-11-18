export const ENUMS = {
  recordStatus: [
    { value: "1", label: "Active", tone: "success" },
    { value: "0", label: "Inactive", tone: "muted" },
  ],
  employmentStatus: [
    { value: "1", label: "Active", tone: "success" },
    { value: "2", label: "Notice", tone: "warning" },
    { value: "3", label: "Resigned", tone: "muted" },
    { value: "4", label: "Exited", tone: "muted" },
  ],
  createLogin: [
    { value: "false", label: "No" },
    { value: "true", label: "Yes" },
  ],
} as const;

export function getStatusLabel(value?: string | number) {
  const normalized = String(value ?? "").toLowerCase();
  return (
    Object.values(ENUMS)
      .flat()
      .find((option) => option.value === normalized)?.label ?? normalized
  );
}

export function getStatusTone(
  value?: string | number,
): "success" | "warning" | "muted" | "info" {
  const normalized = String(value ?? "").toLowerCase();
  const option = Object.values(ENUMS)
    .flat()
    .find((item) => item.value === normalized);
  if (option && "tone" in option) return option.tone;
  return normalized === "pending" || normalized === "on_leave"
    ? "warning"
    : "info";
}

export const ASSET_STATUS = [
  { value: 1, label: "Available", tone: "success" },
  { value: 2, label: "Assigned", tone: "info" },
  { value: 3, label: "Pending return", tone: "warning" },
  { value: 4, label: "In repair", tone: "warning" },
  { value: 5, label: "Retired", tone: "muted" },
  { value: 6, label: "Lost", tone: "danger" },
] as const;

export const ASSET_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

export const SOFTWARE_CATEGORIES = [
  { value: "productivity", label: "Productivity" },
  { value: "dev", label: "Development" },
  { value: "design", label: "Design" },
  { value: "security", label: "Security" },
  { value: "os", label: "Operating system" },
] as const;

export const SOFTWARE_LICENSE_TYPES = [
  { value: "per_user", label: "Per user" },
  { value: "per_seat", label: "Per seat" },
  { value: "subscription", label: "Subscription" },
  { value: "perpetual", label: "Perpetual" },
  { value: "free", label: "Free" },
] as const;

export function getAssetStatusLabel(status?: number) {
  return ASSET_STATUS.find((item) => item.value === status)?.label ?? "Unknown";
}
