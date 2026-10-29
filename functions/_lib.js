export const EVENT = "icos2027";
export function T(env) {
  const p = String(env.TABLE_PREFIX || "icos2027").replace(/[^a-z0-9_]/gi, "");
  return { bookings: `${p}_bookings`, settings: `${p}_settings`, rate: `${p}_ratelimit` };
}

let schemaReady = false;
export async function ensureSchema(env) {
  if (schemaReady) return;
  const t = T(env);
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${t.bookings} (ticket_id TEXT PRIMARY KEY, event TEXT NOT NULL, seat TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE (event, seat))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${t.settings} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
    env.DB.prepare(`INSERT OR IGNORE INTO ${t.settings} (key, value) VALUES ('sections', '{"gold":true,"blue":false,"gray":false}')`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ${t.rate} (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)`),
  ]);
  // Migration: email + order columns (Oct 2026).
  const { results } = await env.DB.prepare(`PRAGMA table_info(${t.bookings})`).all();
  const cols = new Set(results.map((r) => r.name));
  if (!cols.has("email")) await env.DB.prepare(`ALTER TABLE ${t.bookings} ADD COLUMN email TEXT NOT NULL DEFAULT ''`).run().catch(() => {});
  if (!cols.has("order_id")) await env.DB.prepare(`ALTER TABLE ${t.bookings} ADD COLUMN order_id TEXT NOT NULL DEFAULT ''`).run().catch(() => {});
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS ${t.bookings}_email_idx ON ${t.bookings} (event, email)`).run();
  schemaReady = true;
}

export const SECTION_IDS = ["gold", "blue", "gray"];
const COOKIE = "icos_admin";
const enc = new TextEncoder();

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

export function sectionForSeat(code) {
  const m = String(code || "").trim().toUpperCase().match(/^([A-O])(20|1[0-9]|[1-9])$/);
  if (!m) return "";
  if (m[1] <= "G") return "gold";
  if (m[1] <= "J") return "blue";
  return "gray";
}

export async function getSections(env) {
  const row = await env.DB.prepare(`SELECT value FROM ${T(env).settings} WHERE key='sections'`).first();
  const base = { gold: true, blue: false, gray: false };
  try { return { ...base, ...(row ? JSON.parse(row.value) : {}) }; } catch { return base; }
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function secretOf(env) {
  if (!env.SESSION_SECRET) throw new Error("SESSION_SECRET not configured");
  return env.SESSION_SECRET;
}

export async function makeSessionCookie(env) {
  const exp = Date.now() + 8 * 3600 * 1000;
  const payload = `admin.${exp}`;
  const sig = await hmac(secretOf(env), payload);
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(request, env) {
  const raw = (request.headers.get("Cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const parts = raw.slice(COOKIE.length + 1).split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  if (!(Number(parts[1]) > Date.now())) return false;
  const sig = await hmac(secretOf(env), `${parts[0]}.${parts[1]}`);
  return safeEqual(sig, parts[2]);
}

export const MAX_TICKETS = 10;
export function normEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : "";
}

// Fixed-window per-IP rate limit stored in D1. Returns true when allowed.
export async function rateLimit(env, request, bucket, limit, windowSec) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Math.floor(Date.now() / 1000);
  const win = Math.floor(now / windowSec);
  const key = `${bucket}:${(await sha256Hex(ip)).slice(0, 24)}:${win}`;
  const t = T(env).rate;
  const row = await env.DB.prepare(
    `INSERT INTO ${t} (k,n,exp) VALUES (?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n`,
  ).bind(key, (win + 1) * windowSec).first();
  if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM ${t} WHERE exp < ?`).bind(now).run();
  return (row ? row.n : 1) <= limit;
}
