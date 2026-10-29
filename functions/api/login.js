import { json, sha256Hex, safeEqual, makeSessionCookie } from "../_lib.js";
// ADMIN_PASSWORD_HASH = sha256 hex of the admin password (Cloudflare secret).
export async function onRequestPost({ request, env }) {
  const { password } = await request.json().catch(() => ({}));
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) return json({ error: "Admin login is not configured." }, 500);
  const ok = typeof password === "string" && safeEqual(await sha256Hex(password), env.ADMIN_PASSWORD_HASH.toLowerCase());
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: "Incorrect password." }, 401);
  }
  return json({ ok: true }, 200, { "Set-Cookie": await makeSessionCookie(env) });
}
