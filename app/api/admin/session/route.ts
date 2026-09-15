import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await isAdminRequest();
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
