(() => {
  const cfg = window.CC_CONFIG || {};
  const api = (p) => `${cfg.apiBase || ""}/api/${p}`;
  const DEFAULT_SECTIONS = { gold: true, blue: false, gray: false };
  const isAdminPage = /admin/i.test(location.pathname);

  async function call(path, options = {}) {
    const res = await fetch(api(path), {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...options,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function listRegistrations() {
    try {
      if (isAdminPage) {
        const data = await call("bookings");
        return { items: data.items || [], source: "shared", error: "", sections: data.sections || DEFAULT_SECTIONS };
      }
      const data = await call("seats");
      return {
        items: (data.taken || []).map((seat) => ({ seat })),
        source: "shared",
        error: "",
        sections: data.sections || DEFAULT_SECTIONS,
      };
    } catch (err) {
      if (err.status === 401) throw err;
      return { items: [], source: "local", error: String(err.message || err), sections: DEFAULT_SECTIONS };
    }
  }

  async function addRegistration(entry) {
    const data = await call("bookings", { method: "POST", body: JSON.stringify(entry) });
    return { saved: true, source: "shared", sections: data.sections, ticketId: data.ticketId };
  }

  async function bookSeats(payload) {
    return call("bookings", { method: "POST", body: JSON.stringify(payload) });
  }

  async function lookupTickets(email) {
    const data = await call("lookup", { method: "POST", body: JSON.stringify({ email }) });
    return data.tickets || [];
  }

  async function deleteRegistration({ ticketId, seat }) {
    const q = ticketId ? `ticketId=${encodeURIComponent(ticketId)}` : `seat=${encodeURIComponent(seat)}`;
    await call(`bookings?${q}`, { method: "DELETE" });
    const result = await listRegistrations();
    return { deleted: true, items: result.items, sections: result.sections };
  }

  async function setSectionOpen(section, open) {
    const data = await call("sections", { method: "POST", body: JSON.stringify({ section, open }) });
    return { saved: true, source: "shared", sections: data.sections };
  }

  const login = (password) => call("login", { method: "POST", body: JSON.stringify({ password }) });
  const logout = () => call("logout", { method: "POST" }).catch(() => {});
  const session = () => call("session").then((d) => Boolean(d.admin)).catch(() => false);

  function friendlyError(error) {
    const text = String(error || "").trim();
    if (!text) return "";
    if (/aborted|timeout|Failed to fetch|NetworkError/i.test(text)) return "the booking server did not respond";
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }

  window.CCStore = {
    listRegistrations, addRegistration, bookSeats, lookupTickets, deleteRegistration, setSectionOpen,
    login, logout, session, friendlyError, DEFAULT_SECTIONS,
    takenSeats: async () => new Set((await listRegistrations()).items.map((i) => i.seat)),
  };
})();
