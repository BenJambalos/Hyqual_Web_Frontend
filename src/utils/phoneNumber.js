export const PHONE_NUMBER_ERROR = "Enter a valid Philippine mobile number (09xx xxx xxxx).";

export function sanitizePhoneInput(value) {
  const sanitized = String(value).replace(/[^\d+ ]/g, "");
  const plusIndex = sanitized.indexOf("+");
  if (plusIndex === -1) return sanitized;
  return `${sanitized.slice(0, plusIndex)}+${sanitized.slice(plusIndex + 1).replace(/\+/g, "")}`;
}

export function normalizePhoneNumber(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  if (!/^\+?[\d ]+$/.test(input)) return null;

  let digits = input.replace(/[ +]/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (!/^09\d{9}$/.test(digits)) return null;

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}
