import { DEFAULT_COUNTRY_DIAL, isKnownDial } from "./countries";
import { categoryForSeat, isValidSeat, type Category } from "./hall";

export type BookingInput = {
  seat: string;
  fullName: string;
  countryCode: string;
  whatsapp: string;
  email: string;
};

export type BookingFields = {
  seat: string;
  fullName: string;
  countryCode: string;
  whatsappNumber: string;
  whatsappE164: string;
  email: string;
  category: Category;
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeName(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export function digitsOnly(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeCountryCode(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_COUNTRY_DIAL;
  const withPlus = raw.startsWith("+") ? raw : `+${raw}`;
  const compact = `+${digitsOnly(withPlus)}`;
  return compact;
}

/**
 * Build E.164 from a dial code and a national number.
 * Strips a leading 0 (common for Indonesia: 0812… → +62812…).
 * If the national number already includes the country digits, do not double them.
 */
export function toE164(countryCode: string, national: string): string {
  const cc = normalizeCountryCode(countryCode);
  const ccDigits = digitsOnly(cc);
  let num = digitsOnly(national);
  if (!ccDigits || !num) return "";
  if (num.startsWith(ccDigits)) {
    num = num.slice(ccDigits.length);
  }
  num = num.replace(/^0+/, "");
  if (!num) return "";
  return `+${ccDigits}${num}`;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function parseBooking(input: BookingInput): BookingFields {
  const seat = String(input.seat || "").trim().toUpperCase();
  if (!isValidSeat(seat)) {
    throw new ValidationError("Choose a seat on the chart.");
  }
  const category = categoryForSeat(seat);
  if (!category) {
    throw new ValidationError("Choose a seat on the chart.");
  }

  const fullName = normalizeName(input.fullName);
  if (fullName.length < 2) {
    throw new ValidationError("Full name is required.");
  }
  if (fullName.length > 80) {
    throw new ValidationError("Full name must be 80 characters or fewer.");
  }

  const countryCode = normalizeCountryCode(input.countryCode);
  if (!isKnownDial(countryCode) && !/^\+[1-9]\d{0,3}$/.test(countryCode)) {
    throw new ValidationError("Choose a WhatsApp country code.");
  }

  const nationalRaw = String(input.whatsapp || "").trim();
  if (!nationalRaw) {
    throw new ValidationError("WhatsApp number is required.");
  }
  const whatsappE164 = toE164(countryCode, nationalRaw);
  if (!isValidE164(whatsappE164)) {
    throw new ValidationError("Enter a valid WhatsApp number for that country code.");
  }
  const whatsappNumber = digitsOnly(nationalRaw).replace(/^0+/, "") || digitsOnly(whatsappE164).slice(digitsOnly(countryCode).length);

  const email = normalizeEmail(input.email);
  if (!email || !EMAIL_RE.test(email) || email.length > 120) {
    throw new ValidationError("Enter a valid email address.");
  }

  return {
    seat,
    fullName,
    countryCode,
    whatsappNumber,
    whatsappE164,
    email,
    category,
  };
}

export function makeTicketId(): string {
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `CC-2027-${rand}${time}`;
}
