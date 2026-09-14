(() => {
  const cfg = window.CC_CONFIG || {};
  const localKey = cfg.localKey || "cc2026-registrations";
  const deletedKey = "cc2026-deleted-ids";
  const takenCacheKey = "cc2026-taken-cache";
  const bucket = cfg.store && cfg.store.bucket;
  const baseUrl = (cfg.store && cfg.store.baseUrl) || "https://kvdb.io";
  const remoteKey = "registrations";

  function readDeleted() {
    try {
      return new Set(JSON.parse(localStorage.getItem(deletedKey) || "[]"));
    } catch {
      return new Set();
    }
  }

  function writeDeleted(set) {
    localStorage.setItem(deletedKey, JSON.stringify([...set]));
  }

  function markDeleted(ticketId) {
    if (!ticketId) return;
    const set = readDeleted();
    set.add(ticketId);
    writeDeleted(set);
  }

  function withoutDeleted(list) {
    const deleted = readDeleted();
    if (!deleted.size) return list;
    return list.filter((row) => !row.ticketId || !deleted.has(row.ticketId));
  }

  function syncTakenCache(items) {
    try {
      localStorage.setItem(takenCacheKey, JSON.stringify(items.map((item) => item.seat)));
    } catch {
      /* ignore */
    }
  }

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

  async function fetchWithTimeout(url, options = {}, ms = 4000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function readRemote() {
    if (!bucket) return null;
    const res = await fetchWithTimeout(`${baseUrl}/${bucket}/${remoteKey}`, {
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
    if (!bucket) throw new Error("Store is not configured");
    const payload = {
      event: "International Conference of Orthodontic Society 2027",
      updatedAt: new Date().toISOString(),
      items: normalize(list),
    };
    const res = await fetchWithTimeout(`${baseUrl}/${bucket}/${remoteKey}`, {
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

  function finishList(items, source, error) {
    const clean = withoutDeleted(items);
    syncTakenCache(clean);
    return { items: clean, source, error: error || "" };
  }

  async function listRegistrations() {
    const local = withoutDeleted(readLocal());
    try {
      const remote = withoutDeleted(await readRemote());
      const onlyLocal = local.filter((row) => !remote.some((item) => item.ticketId && item.ticketId === row.ticketId));
      if (onlyLocal.length) {
        try {
          await writeRemote(mergeRows(onlyLocal, remote));
          const synced = withoutDeleted(await readRemote());
          return finishList(synced, "shared", "");
        } catch (err) {
          return finishList(
            mergeRows(local, remote),
            remote.length ? "mixed" : "local",
            String(err.message || err),
          );
        }
      }
      if (remote.length) return finishList(remote, "shared", "");
      try {
        await writeRemote(remote);
        return finishList(local, "shared", "");
      } catch (err) {
        return finishList(local, "local", String(err.message || err));
      }
    } catch (err) {
      return finishList(local, "local", String(err.message || err));
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
      remote = withoutDeleted(await readRemote());
      if (remote.some((item) => item.seat === row.seat)) {
        throw new Error("This seat was just taken by another attendee.");
      }
    } catch (err) {
      if (String(err.message || err).includes("just taken")) throw err;
      remoteError = String(err.message || err);
    }

    const local = readLocal();
    if (local.some((item) => item.seat === row.seat && item.ticketId !== row.ticketId)) {
      throw new Error("This seat is already registered on this device.");
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

  async function deleteRegistration({ ticketId, seat }) {
    const local = readLocal();
    const target = local.find((row) => (
      (ticketId && row.ticketId === ticketId) || (!ticketId && seat && row.seat === seat)
    )) || { ticketId, seat };
    if (target.ticketId) markDeleted(target.ticketId);

    const nextLocal = withoutDeleted(local.filter((row) => {
      if (ticketId && row.ticketId === ticketId) return false;
      if (!ticketId && seat && row.seat === seat) return false;
      return true;
    }));
    writeLocal(nextLocal);

    try {
      const remote = await readRemote();
      if (remote) {
        const nextRemote = withoutDeleted(remote.filter((row) => {
          if (ticketId && row.ticketId === ticketId) return false;
          if (target.ticketId && row.ticketId === target.ticketId) return false;
          if (!ticketId && seat && row.seat === seat) return false;
          return true;
        }));
        await writeRemote(nextRemote);
      }
    } catch {
      /* silent local fallback */
    }

    syncTakenCache(nextLocal);
    return { deleted: true, items: nextLocal };
  }

  window.CCStore = {
    listRegistrations,
    addRegistration,
    deleteRegistration,
    takenSeats: async () => {
      const { items } = await listRegistrations();
      return new Set(items.map((item) => item.seat));
    },
  };
})();
