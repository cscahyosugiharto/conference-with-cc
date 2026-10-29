import { EVENT, json, getSections, sectionForSeat, isAdmin, T, normEmail, MAX_TICKETS, rateLimit } from "../_lib.js";

const LABELS = { gold: "Gold", blue: "Blue", gray: "Gray" };
const cleanName = (v) => String(v || "").replace(/\s+/g, " ").trim();
const newId = () => `ICOS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

// Book 1..MAX_TICKETS seats in one all-or-nothing batch.
// Body: { email, buyerName, tickets: [{ seat, name }] }
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (!(await rateLimit(env, request, "book", 20, 600))) return json({ error: "Too many booking attempts. Please wait a few minutes." }, 429);
  const email = normEmail(body.email);
  if (!email) return json({ error: "Please enter a valid email address." }, 400);
  const buyer = cleanName(body.buyerName || body.name);
  const list = Array.isArray(body.tickets) ? body.tickets : [{ seat: body.seat, name: body.name }];
  if (!list.length || list.length > MAX_TICKETS) return json({ error: `You can book 1 to ${MAX_TICKETS} tickets at a time.` }, 400);
  const sections = await getSections(env);
  const seen = new Set();
  const tickets = [];
  for (const t of list) {
    const seat = String((t && t.seat) || "").trim().toUpperCase();
    const name = cleanName((t && t.name) || buyer);
    const section = sectionForSeat(seat);
    if (!section) return json({ error: `Invalid seat ${seat}.` }, 400);
    if (seen.has(seat)) return json({ error: `Seat ${seat} was selected twice.` }, 400);
    seen.add(seat);
    if (name.length < 2 || name.length > 80) return json({ error: `Please enter a valid name for seat ${seat} (2-80 characters).` }, 400);
    if (sections[section] === false) return json({ error: `Seat ${seat} is in a section that is not open for booking.` }, 409);
    tickets.push({ ticketId: newId(), seat, name, category: LABELS[section] });
  }
  const orderId = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const tb = T(env).bookings;
  try {
    // D1 batch = one transaction: any UNIQUE(event, seat) failure rolls back every insert.
    await env.DB.batch(tickets.map((t) => env.DB.prepare(
      `INSERT INTO ${tb} (ticket_id,event,seat,name,category,created_at,email,order_id) VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(t.ticketId, EVENT, t.seat, t.name, t.category, createdAt, email, orderId)));
  } catch (err) {
    if (/UNIQUE/i.test(String(err.message || err))) {
      const ph = tickets.map(() => "?").join(",");
      const { results } = await env.DB.prepare(`SELECT seat FROM ${tb} WHERE event=? AND seat IN (${ph})`)
        .bind(EVENT, ...tickets.map((t) => t.seat)).all();
      const taken = results.map((r) => r.seat);
      return json({
        error: `${taken.length ? `Seat ${taken.join(", ")} ${taken.length > 1 ? "were" : "was"}` : "A seat was"} just taken by another attendee. Nothing was booked; please choose again.`,
        taken,
      }, 409);
    }
    throw err;
  }
  return json({ saved: true, orderId, email, createdAt, tickets, sections }, 201);
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  const { results } = await env.DB.prepare(
    `SELECT ticket_id AS ticketId, seat, name, email, order_id AS orderId, category, created_at AS createdAt FROM ${T(env).bookings} WHERE event=? ORDER BY created_at DESC`,
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
