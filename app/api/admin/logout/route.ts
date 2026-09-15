import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, requestIsHttps } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(requestIsHttps(request)), maxAge: 0 });
  return response;
}
