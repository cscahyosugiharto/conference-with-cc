import { NextResponse } from "next/server";
import { createBooking } from "@/lib/server/db";
import { missingSupabaseMessage, supabaseConfigured } from "@/lib/server/supabase";
import { makeTicketId, parseBooking, ValidationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: missingSupabaseMessage() }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send booking details as JSON." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const fields = parseBooking({
      seat: String(raw.seat ?? ""),
      fullName: String(raw.fullName ?? ""),
      countryCode: String(raw.countryCode ?? ""),
      whatsapp: String(raw.whatsapp ?? ""),
      email: String(raw.email ?? ""),
    });
    const booking = await createBooking(fields, makeTicketId());
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.name === "SectionClosedError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "SeatTakenError") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save this booking." }, { status: 500 });
  }
}
