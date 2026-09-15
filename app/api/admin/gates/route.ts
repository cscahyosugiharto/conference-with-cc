import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/auth";
import { readHallState, updateGates } from "@/lib/server/db";
import { missingSupabaseMessage, supabaseConfigured } from "@/lib/server/supabase";
import type { Gates } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  const state = await readHallState();
  return NextResponse.json({ gates: state.gates, configured: state.configured, error: state.error });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: missingSupabaseMessage() }, { status: 503 });
  }

  let body: Partial<Gates> = {};
  try {
    body = (await request.json()) as Partial<Gates>;
  } catch {
    return NextResponse.json({ error: "Send section toggles as JSON." }, { status: 400 });
  }

  const patch: Partial<Gates> = {};
  for (const id of ["gold", "blue", "gray"] as const) {
    if (typeof body[id] === "boolean") patch[id] = body[id];
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "No section toggle provided." }, { status: 400 });
  }

  try {
    const gates = await updateGates(patch);
    return NextResponse.json({ gates });
  } catch {
    return NextResponse.json({ error: "Could not update section gates." }, { status: 500 });
  }
}
