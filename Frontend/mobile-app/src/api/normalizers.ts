/** @format */

type FirestoreTimestamp =
  | string
  | Date
  | { _seconds?: number; seconds?: number; _nanoseconds?: number }
  | null
  | undefined;

export function toIsoDate(value: FirestoreTimestamp): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const seconds =
    typeof value._seconds === "number"
      ? value._seconds
      : typeof value.seconds === "number"
        ? value.seconds
        : undefined;

  if (seconds == null) {
    return undefined;
  }

  return new Date(seconds * 1000).toISOString();
}

export function formatAddress(address?: {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  province?: string;
}): string {
  return [
    address?.line1,
    address?.line2,
    address?.city,
    address?.district,
    address?.province,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(", ");
}

export function titleCase(value?: string): string {
  if (!value) {
    return "";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
