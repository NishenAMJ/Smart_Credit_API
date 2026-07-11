/** @format */

export function firstChar(value?: string, fallback = "-") {
  if (!value) {
    return fallback;
  }
  return value.charAt(0).toUpperCase();
}
