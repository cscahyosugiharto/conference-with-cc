import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/auth";
import { deleteBooking, listRegistrations } from "@/lib/server/db";
import { missingSupabaseMessage, supabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: missingSupabaseMessage(), items: [] }, { status: 503 });
  }
  try {
    const items = await listRegistrations();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Could not load registrations." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: missingSupabaseMessage() }, { status: 503 });
  }

  let body: { ticketId?: string; seat?: string } = {};
  try {
    body = (await request.json()) as { ticketId?: string; seat?: string };
  } catch {
    return NextResponse.json({ error: "Ticket or seat is required." }, { status: 400 });
  }

  if (!body.ticketId && !body.seat) {
    return NextResponse.json({ error: "Ticket or seat is required." }, { status: 400 });
  }

  try {
    await deleteBooking({ ticketId: body.ticketId, seat: body.seat });
    const items = await listRegistrations();
    return NextResponse.json({ deleted: true, items });
  } catch {
    return NextResponse.json({ error: "Could not delete that booking." }, { status: 500 });
  }
}
