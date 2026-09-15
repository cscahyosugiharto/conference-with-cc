import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, adminCookieValue, adminPassword, requestIsHttps } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const expected = adminPassword();
  if (!password || password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminCookieValue(), adminCookieOptions(requestIsHttps(request)));
  return response;
}
