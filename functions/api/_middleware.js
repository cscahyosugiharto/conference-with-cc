import { ensureSchema, json } from "../_lib.js";
export async function onRequest({ env, next, request }) {
  try {
    await ensureSchema(env);
    if (request.method !== "GET") {
      const origin = request.headers.get("Origin");
      if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Bad origin" }, 403);
    }
    return await next();
  } catch (err) {
    console.error("api error", err && err.stack || err);
    return json({ error: "Server error" }, 500);
  }
}
