import type { Category } from "./hall";

export type Gates = Record<Category, boolean>;

export const DEFAULT_GATES: Gates = {
  gold: true,
  blue: false,
  gray: false,
};

export type PublicHallState = {
  taken: string[];
  gates: Gates;
  configured: boolean;
  error: string;
};

export type RegistrationRecord = {
  id: string;
  seat: string;
  fullName: string;
  countryCode: string;
  whatsappNumber: string;
  whatsappE164: string;
  email: string;
  category: Category;
  ticketId: string;
  createdAt: string;
};

export type BookingResult = {
  ticketId: string;
  seat: string;
  fullName: string;
  email: string;
  whatsappE164: string;
  category: Category;
  createdAt: string;
};
