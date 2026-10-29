import { EVENT, json, getSections, T } from "../_lib.js";
// Public: only taken seat codes + section gates (no names).
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`SELECT seat FROM ${T(env).bookings} WHERE event=?`).bind(EVENT).all();
  return json({ taken: results.map((r) => r.seat), sections: await getSections(env) });
}
