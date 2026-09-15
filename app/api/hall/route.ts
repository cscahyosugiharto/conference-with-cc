import { NextResponse } from "next/server";
import { readHallState } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readHallState();
  const status = state.configured && state.error ? 503 : 200;
  return NextResponse.json(state, { status });
}
