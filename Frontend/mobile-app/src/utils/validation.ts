/** @format */

export function isValidAmount(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function isRequired(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}
