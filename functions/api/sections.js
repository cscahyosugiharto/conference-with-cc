import { json, getSections, isAdmin, SECTION_IDS, T } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  const { section, open } = await request.json().catch(() => ({}));
  if (!SECTION_IDS.includes(section)) return json({ error: "Unknown section" }, 400);
  const next = { ...(await getSections(env)), [section]: Boolean(open) };
  await env.DB.prepare(`INSERT OR REPLACE INTO ${T(env).settings} (key,value) VALUES ('sections',?)`).bind(JSON.stringify(next)).run();
  return json({ saved: true, sections: next });
}
