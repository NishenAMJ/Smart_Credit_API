export type FieldErrors<Field extends string = string> = Partial<
  Record<Field, string>
>;

export class ApiValidationError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiValidationError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function apiErrorFromResponse(
  status: number,
  body: unknown,
  fallback: string,
): ApiValidationError {
  const value =
    body && typeof body === "object"
      ? (body as {
          message?: string | string[];
          fieldErrors?: Record<string, string[]>;
        })
      : {};
  const message = Array.isArray(value.message)
    ? value.message.join(" ")
    : value.message || fallback;
  return new ApiValidationError(message, status, value.fieldErrors ?? {});
}

export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function requiredText(
  value: string,
  label: string,
  options: { min?: number; max?: number } = {},
): string | undefined {
  const normalized = value.trim();
  if (!normalized) return `${label} is required.`;
  if (options.min && normalized.length < options.min)
    return `${label} must be at least ${options.min} characters.`;
  if (options.max && normalized.length > options.max)
    return `${label} cannot exceed ${options.max} characters.`;
  return undefined;
}

export function optionalText(
  value: string,
  label: string,
  options: { min?: number; max?: number } = {},
): string | undefined {
  return value.trim() ? requiredText(value, label, options) : undefined;
}

export function emailError(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
  return undefined;
}

export function phoneError(value: string, required = true): string | undefined {
  const phone = value.trim();
  if (!phone) return required ? "Phone is required." : undefined;
  return /^[0-9+\-\s()]{9,20}$/.test(phone)
    ? undefined
    : "Enter a valid phone number using 9 to 20 characters.";
}

export function numberError(
  value: string | number,
  label: string,
  options: {
    min: number;
    max: number;
    integer?: boolean;
    maxDecimals?: number;
  },
): string | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return `Enter a valid ${label.toLowerCase()}.`;
  if (options.integer && !Number.isInteger(numeric))
    return `${label} must be a whole number.`;
  if (numeric < options.min || numeric > options.max)
    return `${label} must be between ${options.min.toLocaleString()} and ${options.max.toLocaleString()}.`;
  if (
    options.maxDecimals !== undefined &&
    Math.abs(
      numeric * 10 ** options.maxDecimals -
        Math.round(numeric * 10 ** options.maxDecimals),
    ) >
      Number.EPSILON * 100
  )
    return `${label} can contain at most ${options.maxDecimals} decimal places.`;
  return undefined;
}

export function dateError(
  value: string,
  label: string,
  options: { notFuture?: boolean; min?: string | null } = {},
): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label} is required.`;
  const date = new Date(`${value}T00:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") !== value
  )
    return `Enter a valid ${label.toLowerCase()}.`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (options.notFuture && date > today)
    return `${label} cannot be in the future.`;
  if (options.min && value < options.min)
    return `${label} cannot be before ${options.min}.`;
  return undefined;
}

export function fileError(
  file: File | null,
  label: string,
  options: {
    required?: boolean;
    imageOnly?: boolean;
    maxBytes?: number;
  } = {},
): string | undefined {
  if (!file) return options.required ? `${label} is required.` : undefined;
  const allowed = options.imageOnly ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
  if (!(allowed as readonly string[]).includes(file.type))
    return options.imageOnly
      ? `${label} must be a JPG, PNG, or WEBP image.`
      : `${label} must be a JPG, PNG, WEBP, or PDF file.`;
  if (file.size > (options.maxBytes ?? MAX_DOCUMENT_BYTES))
    return `${label} must be 10 MB or smaller.`;
  return undefined;
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/\D/g, "")}`
    : trimmed.replace(/\D/g, "");
}

export function focusFirstInvalidField(errors: FieldErrors): void {
  const first = Object.keys(errors)[0];
  if (!first) return;
  window.requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(`[data-validation-field="${first}"]`)
      ?.focus();
  });
}

export function getApiFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};
  const value = error as { fieldErrors?: Record<string, string[]> };
  return Object.fromEntries(
    Object.entries(value.fieldErrors ?? {}).map(([field, messages]) => [
      field,
      messages[0] ?? "Invalid value.",
    ]),
  );
}
