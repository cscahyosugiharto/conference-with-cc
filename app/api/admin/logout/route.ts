import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
