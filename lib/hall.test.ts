import { describe, expect, it } from "vitest";
import {
  AISLE_GROUPS,
  CATEGORY_SEAT_COUNTS,
  TOTAL_SEATS,
  allSeats,
  categoryForSeat,
  isValidSeat,
  parseSeat,
} from "./hall";
import { isValidE164, parseBooking, toE164, ValidationError } from "./validation";

describe("hall map", () => {
  it("has 300 seats A–O × 1–20", () => {
    const seats = allSeats();
    expect(seats).toHaveLength(300);
    expect(TOTAL_SEATS).toBe(300);
    expect(seats[0].code).toBe("A1");
    expect(seats[seats.length - 1].code).toBe("O20");
  });

  it("splits Gold 140, Blue 60, Gray 100", () => {
    expect(CATEGORY_SEAT_COUNTS).toEqual({ gold: 140, blue: 60, gray: 100 });
    const seats = allSeats();
    expect(seats.filter((s) => s.category === "gold")).toHaveLength(140);
    expect(seats.filter((s) => s.category === "blue")).toHaveLength(60);
    expect(seats.filter((s) => s.category === "gray")).toHaveLength(100);
    expect(categoryForSeat("G20")).toBe("gold");
    expect(categoryForSeat("H1")).toBe("blue");
    expect(categoryForSeat("J20")).toBe("blue");
    expect(categoryForSeat("K1")).toBe("gray");
  });

  it("uses aisles 1–6 / 7–14 / 15–20", () => {
    expect(AISLE_GROUPS).toEqual([
      { start: 1, end: 6 },
      { start: 7, end: 14 },
      { start: 15, end: 20 },
    ]);
  });

  it("accepts only A–O and 1–20", () => {
    expect(isValidSeat("A1")).toBe(true);
    expect(isValidSeat("O20")).toBe(true);
    expect(isValidSeat("A0")).toBe(false);
    expect(isValidSeat("A21")).toBe(false);
    expect(isValidSeat("P1")).toBe(false);
    expect(parseSeat("h12")).toEqual({ row: "H", number: 12 });
  });
});

describe("booking validation", () => {
  const base = {
    seat: "A7",
    fullName: "Cahyo Sugiharto",
    countryCode: "+62",
    whatsapp: "081234567890",
    email: "cahyo@example.com",
  };

  it("normalises Indonesian WhatsApp to E.164", () => {
    expect(toE164("+62", "081234567890")).toBe("+6281234567890");
    expect(toE164("+62", "81234567890")).toBe("+6281234567890");
    expect(toE164("+62", "6281234567890")).toBe("+6281234567890");
    expect(isValidE164("+6281234567890")).toBe(true);
  });

  it("stores name, WhatsApp, and email with the seat", () => {
    const parsed = parseBooking(base);
    expect(parsed.seat).toBe("A7");
    expect(parsed.fullName).toBe("Cahyo Sugiharto");
    expect(parsed.countryCode).toBe("+62");
    expect(parsed.whatsappE164).toBe("+6281234567890");
    expect(parsed.email).toBe("cahyo@example.com");
    expect(parsed.category).toBe("gold");
  });

  it("rejects a missing name, bad email, or closed-format seat", () => {
    expect(() => parseBooking({ ...base, fullName: " " })).toThrow(ValidationError);
    expect(() => parseBooking({ ...base, email: "not-an-email" })).toThrow(/valid email/i);
    expect(() => parseBooking({ ...base, whatsapp: "12" })).toThrow(/WhatsApp/i);
    expect(() => parseBooking({ ...base, seat: "Z9" })).toThrow(/seat/i);
  });
});
