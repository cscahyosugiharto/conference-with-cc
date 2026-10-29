import { EVENT, json, getSections, sectionForSeat, isAdmin, T } from "../_lib.js";

const LABELS = { gold: "Gold", blue: "Blue", gray: "Gray" };

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const name = String(body.name || "").replace(/\s+/g, " ").trim();
  const seat = String(body.seat || "").trim().toUpperCase();
  if (name.length < 2 || name.length > 80) return json({ error: "Please enter a valid name (2-80 characters)." }, 400);
  const section = sectionForSeat(seat);
  if (!section) return json({ error: "Invalid seat." }, 400);
  const sections = await getSections(env);
  if (sections[section] === false) return json({ error: "This section is not open for booking." }, 409);
  const ticketId = String(body.ticketId || "").match(/^[A-Za-z0-9-]{4,40}$/) ? body.ticketId : `ICOS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const category = String(body.category || LABELS[section]).slice(0, 40);
  const createdAt = new Date().toISOString();
  try {
    await env.DB.prepare(`INSERT INTO ${T(env).bookings} (ticket_id,event,seat,name,category,created_at) VALUES (?,?,?,?,?,?)`)
      .bind(ticketId, EVENT, seat, name, category, createdAt).run();
  } catch (err) {
    if (/UNIQUE/i.test(String(err.message || err))) {
      return json({ error: "This seat was just taken by another attendee." }, 409);
    }
    throw err;
  }
  return json({ saved: true, ticketId, seat, name, category, createdAt, sections }, 201);
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  const { results } = await env.DB.prepare(
    `SELECT ticket_id AS ticketId, seat, name, category, created_at AS createdAt FROM ${T(env).bookings} WHERE event=? ORDER BY created_at DESC`,
  ).bind(EVENT).all();
  return json({ items: results, sections: await getSections(env) });
}

export async function onRequestDelete({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticketId");
  const seat = url.searchParams.get("seat");
  if (ticketId) await env.DB.prepare(`DELETE FROM ${T(env).bookings} WHERE event=? AND ticket_id=?`).bind(EVENT, ticketId).run();
  else if (seat) await env.DB.prepare(`DELETE FROM ${T(env).bookings} WHERE event=? AND seat=?`).bind(EVENT, seat).run();
  else return json({ error: "ticketId or seat required" }, 400);
  return json({ deleted: true });
}
