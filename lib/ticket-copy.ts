import { CATEGORY_LABEL, type Category } from "./hall";

export type TicketPayload = {
  name: string;
  seat: string;
  category?: string;
  id: string;
  email?: string;
  whatsapp?: string;
};

export const EVENT = {
  name: "International Conference of Orthodontic Society 2027",
  short: "ICOS 2027",
  cc: "CC 2027",
};

export const TICKET_BLANK_SRC = "/assets/ticket-blank-v2.jpg";

export function categoryDisplay(category: Category | string): string {
  if (category === "gold" || category === "blue" || category === "gray") {
    return CATEGORY_LABEL[category];
  }
  return category || "Not set";
}

export function ticketFileName(seat: string, ticketId: string): string {
  return `ICOS-2027-${seat}-${ticketId}.pdf`;
}

export function ticketShareText(meta: TicketPayload): string {
  const lines = [
    EVENT.name,
    `${EVENT.short} · ${EVENT.cc}`,
    `Full Name: ${meta.name}`,
    `Seat Code: ${meta.seat}`,
    `Ticket ID: ${meta.id}`,
  ];
  if (meta.whatsapp) lines.push(`WhatsApp: ${meta.whatsapp}`);
  if (meta.email) lines.push(`Email: ${meta.email}`);
  return lines.join("\n");
}
