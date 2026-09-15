import { DEFAULT_GATES } from "../types";
import type { BookingResult, Gates, PublicHallState, RegistrationRecord } from "../types";
import type { BookingFields } from "../validation";
import { getServiceClient, missingSupabaseMessage, supabaseConfigured } from "./supabase";

type RegistrationRow = {
  id: string;
  seat: string;
  full_name: string;
  country_code: string;
  whatsapp_number: string;
  whatsapp_e164: string;
  email: string;
  category: "gold" | "blue" | "gray";
  ticket_id: string;
  created_at: string;
};

function mapRow(row: RegistrationRow): RegistrationRecord {
  return {
    id: row.id,
    seat: row.seat,
    fullName: row.full_name,
    countryCode: row.country_code,
    whatsappNumber: row.whatsapp_number,
    whatsappE164: row.whatsapp_e164,
    email: row.email,
    category: row.category,
    ticketId: row.ticket_id,
    createdAt: row.created_at,
  };
}

function gatesFromRows(rows: { id: string; open: boolean }[] | null): Gates {
  const next: Gates = { ...DEFAULT_GATES };
  for (const row of rows || []) {
    if (row.id === "gold" || row.id === "blue" || row.id === "gray") {
      next[row.id] = Boolean(row.open);
    }
  }
  return next;
}

export async function readHallState(): Promise<PublicHallState> {
  if (!supabaseConfigured()) {
    return {
      taken: [],
      gates: { ...DEFAULT_GATES },
      configured: false,
      error: missingSupabaseMessage(),
    };
  }

  try {
    const supabase = getServiceClient();
    const [seats, gates] = await Promise.all([
      supabase.from("occupied_seats").select("seat"),
      supabase.from("section_gates").select("id, open"),
    ]);

    if (seats.error) throw new Error(seats.error.message);
    if (gates.error) throw new Error(gates.error.message);

    return {
      taken: (seats.data || []).map((row) => String(row.seat)),
      gates: gatesFromRows(gates.data),
      configured: true,
      error: "",
    };
  } catch (err) {
    return {
      taken: [],
      gates: { ...DEFAULT_GATES },
      configured: true,
      error: `Could not load the hall (${String((err as Error).message || err)}).`,
    };
  }
}

export async function listRegistrations(): Promise<RegistrationRecord[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, seat, full_name, country_code, whatsapp_number, whatsapp_e164, email, category, ticket_id, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as RegistrationRow[] | null)?.map(mapRow) ?? [];
}

export async function createBooking(fields: BookingFields, ticketId: string): Promise<BookingResult> {
  const supabase = getServiceClient();

  const { data: gate, error: gateError } = await supabase
    .from("section_gates")
    .select("open")
    .eq("id", fields.category)
    .maybeSingle();
  if (gateError) throw new Error(gateError.message);
  if (!gate || gate.open !== true) {
    const err = new Error("This section is not open for booking yet.");
    err.name = "SectionClosedError";
    throw err;
  }

  const { data, error } = await supabase
    .from("registrations")
    .insert({
      seat: fields.seat,
      full_name: fields.fullName,
      country_code: fields.countryCode,
      whatsapp_number: fields.whatsappNumber,
      whatsapp_e164: fields.whatsappE164,
      email: fields.email,
      category: fields.category,
      ticket_id: ticketId,
    })
    .select(
      "id, seat, full_name, country_code, whatsapp_number, whatsapp_e164, email, category, ticket_id, created_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      const err = new Error("This seat was just taken by another attendee.");
      err.name = "SeatTakenError";
      throw err;
    }
    throw new Error(error.message);
  }

  const row = data as RegistrationRow;
  return {
    ticketId: row.ticket_id,
    seat: row.seat,
    fullName: row.full_name,
    email: row.email,
    whatsappE164: row.whatsapp_e164,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function deleteBooking(opts: { ticketId?: string; seat?: string }): Promise<void> {
  const supabase = getServiceClient();
  let query = supabase.from("registrations").delete();
  if (opts.ticketId) query = query.eq("ticket_id", opts.ticketId);
  else if (opts.seat) query = query.eq("seat", opts.seat);
  else throw new Error("Missing ticket or seat.");
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function updateGates(patch: Partial<Gates>): Promise<Gates> {
  const supabase = getServiceClient();
  const updates = (["gold", "blue", "gray"] as const)
    .filter((id) => typeof patch[id] === "boolean")
    .map((id) => ({ id, open: Boolean(patch[id]) }));
  if (!updates.length) {
    const { data, error } = await supabase.from("section_gates").select("id, open");
    if (error) throw new Error(error.message);
    return gatesFromRows(data);
  }
  const { error } = await supabase.from("section_gates").upsert(updates);
  if (error) throw new Error(error.message);
  const { data, error: readError } = await supabase.from("section_gates").select("id, open");
  if (readError) throw new Error(readError.message);
  return gatesFromRows(data);
}
