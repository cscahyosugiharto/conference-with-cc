import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "icos_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "cc2026";
}

export function adminCookieValue(): string {
  return createHmac("sha256", adminPassword()).update("icos-2027-admin-session").digest("hex");
}

export function cookieMatches(token: string | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(adminCookieValue());
  const got = Buffer.from(token);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return cookieMatches(jar.get(ADMIN_COOKIE)?.value);
}

export function adminCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
    secure,
  };
}

export function requestIsHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
