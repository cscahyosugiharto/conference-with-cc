export const ROWS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
] as const;

export type RowLetter = (typeof ROWS)[number];
export type Category = "gold" | "blue" | "gray";

export const SEATS_PER_ROW = 20;
export const TOTAL_SEATS = ROWS.length * SEATS_PER_ROW;

/** Left 1–6, centre 7–14, right 15–20. */
export const AISLE_GROUPS = [
  { start: 1, end: 6 },
  { start: 7, end: 14 },
  { start: 15, end: 20 },
] as const;

export const CATEGORY_ROWS: Record<Category, readonly RowLetter[]> = {
  gold: ["A", "B", "C", "D", "E", "F", "G"],
  blue: ["H", "I", "J"],
  gray: ["K", "L", "M", "N", "O"],
};

export const CATEGORY_SEAT_COUNTS: Record<Category, number> = {
  gold: CATEGORY_ROWS.gold.length * SEATS_PER_ROW,
  blue: CATEGORY_ROWS.blue.length * SEATS_PER_ROW,
  gray: CATEGORY_ROWS.gray.length * SEATS_PER_ROW,
};

export const CATEGORY_LABEL: Record<Category, string> = {
  gold: "Gold",
  blue: "Blue",
  gray: "Gray",
};

export const CATEGORY_RANGE: Record<Category, string> = {
  gold: "A–G",
  blue: "H–J",
  gray: "K–O",
};

const SEAT_RE = /^([A-O])([1-9]|1[0-9]|20)$/;

export function categoryForRow(row: string): Category {
  if (row <= "G") return "gold";
  if (row <= "J") return "blue";
  return "gray";
}

export function seatCode(row: string, n: number): string {
  return `${row}${n}`;
}

export function parseSeat(code: string): { row: RowLetter; number: number } | null {
  const match = String(code || "").trim().toUpperCase().match(SEAT_RE);
  if (!match) return null;
  return { row: match[1] as RowLetter, number: Number(match[2]) };
}

export function isValidSeat(code: string): boolean {
  return parseSeat(code) !== null;
}

export function categoryForSeat(code: string): Category | null {
  const parsed = parseSeat(code);
  if (!parsed) return null;
  return categoryForRow(parsed.row);
}

export type SeatCell = {
  code: string;
  row: RowLetter;
  number: number;
  category: Category;
};

export function seatsInGroup(row: RowLetter, start: number, end: number): SeatCell[] {
  const category = categoryForRow(row);
  const seats: SeatCell[] = [];
  for (let n = start; n <= end; n += 1) {
    seats.push({ code: seatCode(row, n), row, number: n, category });
  }
  return seats;
}

export function allSeats(): SeatCell[] {
  return ROWS.flatMap((row) => seatsInGroup(row, 1, SEATS_PER_ROW));
}

export function columnNumbers(start: number, end: number): number[] {
  const nums: number[] = [];
  for (let n = start; n <= end; n += 1) nums.push(n);
  return nums;
}
