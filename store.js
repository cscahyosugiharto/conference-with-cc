(() => {
  const cfg = window.CC_CONFIG || {};
  const localKey = cfg.localKey || "cc2026-registrations";
  const bucket = cfg.store && cfg.store.bucket;
  const baseUrl = (cfg.store && cfg.store.baseUrl) || "https://kvdb.io";
  const remoteKey = "registrations";

  function normalize(list) {
    return (Array.isArray(list) ? list : [])
      .filter((row) => row && row.name && row.seat)
      .map((row) => ({
        name: String(row.name),
        seat: String(row.seat),
        category: row.category || "",
        ticketId: row.ticketId || "",
        createdAt: row.createdAt || "",
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function readLocal() {
    try {
      return normalize(JSON.parse(localStorage.getItem(localKey) || "[]"));
    } catch (err) {
      return [];
    }
  }

  function writeLocal(list) {
    localStorage.setItem(localKey, JSON.stringify(normalize(list)));
  }

  async function readRemote() {
    if (!bucket) return null;
    const res = await fetch(`${baseUrl}/${bucket}/${remoteKey}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return [];
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Store HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) return normalize(data);
    return normalize(data.items || data.registrations || []);
  }

  async function writeRemote(list) {
    if (!bucket) throw new Error("Store belum dikonfigurasi");
    const payload = {
      event: "Conference with CC 2026",
      updatedAt: new Date().toISOString(),
      items: normalize(list),
    };
    const res = await fetch(`${baseUrl}/${bucket}/${remoteKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Store HTTP ${res.status}`);
    }
  }

  function mergeRows(a, b) {
    const merged = new Map();
    [...a, ...b].forEach((row) => {
      merged.set(`${row.ticketId}|${row.seat}|${row.name}`, row);
    });
    return normalize([...merged.values()]);
  }

  async function listRegistrations() {
    const local = readLocal();
    try {
      const remote = await readRemote();
      const onlyLocal = local.filter((row) => !remote.some((item) => item.ticketId && item.ticketId === row.ticketId));
      if (onlyLocal.length) {
        try {
          await writeRemote(mergeRows(onlyLocal, remote));
          const synced = await readRemote();
          return { items: synced, source: "shared", error: "" };
        } catch (err) {
          return {
            items: mergeRows(local, remote),
            source: remote.length ? "mixed" : "local",
            error: String(err.message || err),
          };
        }
      }
      if (remote.length) return { items: remote, source: "shared", error: "" };
      try {
        await writeRemote(remote);
        return { items: local, source: "shared", error: "" };
      } catch (err) {
        return { items: local, source: "local", error: String(err.message || err) };
      }
    } catch (err) {
      return { items: local, source: "local", error: String(err.message || err) };
    }
  }

  async function addRegistration(entry) {
    const row = {
      name: entry.name.trim(),
      seat: entry.seat,
      category: entry.category || "",
      ticketId: entry.ticketId || "",
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    let remote = null;
    let remoteError = "";
    try {
      remote = await readRemote();
      if (remote.some((item) => item.seat === row.seat)) {
        throw new Error("Kursi ini sudah diambil peserta lain.");
      }
    } catch (err) {
      if (String(err.message || err).includes("sudah diambil")) throw err;
      remoteError = String(err.message || err);
    }

    const local = readLocal();
    if (local.some((item) => item.seat === row.seat && item.ticketId !== row.ticketId)) {
      throw new Error("Kursi ini sudah terdaftar di perangkat ini.");
    }
    writeLocal([row, ...local.filter((item) => item.ticketId !== row.ticketId)]);

    if (remote) {
      try {
        await writeRemote([row, ...remote]);
        return { saved: true, source: "shared" };
      } catch (err) {
        return { saved: true, source: "local", error: String(err.message || err) };
      }
    }
    return { saved: true, source: "local", error: remoteError };
  }

  window.CCStore = {
    listRegistrations,
    addRegistration,
    takenSeats: async () => {
      const { items } = await listRegistrations();
      return new Set(items.map((item) => item.seat));
    },
  };
})();
