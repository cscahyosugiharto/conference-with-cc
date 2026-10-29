import { json, isAdmin } from "../_lib.js";
export const onRequestGet = async ({ request, env }) => json({ admin: await isAdmin(request, env) });
