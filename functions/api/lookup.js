import { EVENT, json, T, normEmail, rateLimit } from "../_lib.js";
// Public ticket lookup by email: POST only, rate limited per IP, returns only that email's tickets.
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (!(await rateLimit(env, request, "lookup", 10, 600))) return json({ error: "Too many lookups. Please wait 10 minutes and try again." }, 429);
  const email = normEmail(body.email);
  if (!email) return json({ error: "Please enter a valid email address." }, 400);
  const { results } = await env.DB.prepare(
    `SELECT ticket_id AS ticketId, seat, name, category FROM ${T(env).bookings} WHERE event=? AND email=? ORDER BY created_at, seat`,
  ).bind(EVENT, email).all();
  return json({ tickets: results });
}
