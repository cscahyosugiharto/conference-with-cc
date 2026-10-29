import { json, clearCookie } from "../_lib.js";
export const onRequestPost = () => json({ ok: true }, 200, { "Set-Cookie": clearCookie });
