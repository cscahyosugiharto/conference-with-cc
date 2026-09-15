(() => {
  const cfg = window.CC_CONFIG || {};
  const localKey = cfg.localKey || "cc2026-registrations";
  const deletedKey = "cc2026-deleted-ids";
  const takenCacheKey = "cc2026-taken-cache";
  const sectionsKey = "cc2026-section-gates";
  const bucket = cfg.store && cfg.store.bucket;
  const baseUrl = (cfg.store && cfg.store.baseUrl) || "https://kvdb.io";
  const remoteKey = "registrations";
  const DEFAULT_SECTIONS = { gold: true, blue: false, gray: false };
  const SECTION_IDS = ["gold", "blue", "gray"];

  let lastSections = readLocalSections();

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

  function normalizeSections(raw) {
    const next = { ...DEFAULT_SECTIONS };
    if (!raw || typeof raw !== "object") return next;
    SECTION_IDS.forEach((id) => {
      if (typeof raw[id] === "boolean") next[id] = raw[id];
    });
    return next;
  }

  function readLocalSections() {
    try {
      const raw = localStorage.getItem(sectionsKey);
      if (!raw) return { ...DEFAULT_SECTIONS };
      return normalizeSections(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SECTIONS };
    }
  }

  function writeLocalSections(sections) {
    lastSections = normalizeSections(sections);
    try {
      localStorage.setItem(sectionsKey, JSON.stringify(lastSections));
    } catch {
      /* ignore quota / private mode */
    }
    return lastSections;
  }

  function sectionForSeat(seat) {
    if (window.CCHall && typeof window.CCHall.sectionForSeat === "function") {
      return window.CCHall.sectionForSeat(seat);
    }
    const m = String(seat || "").trim().toUpperCase().match(/^([A-O])(20|1[0-9]|[1-9])$/);
    if (!m) return "";
    const row = m[1];
    if (row <= "G") return "gold";
    if (row <= "J") return "blue";
    return "gray";
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

  function parseRemotePayload(data) {
    if (Array.isArray(data)) {
      return { items: normalize(data), sections: null };
    }
    return {
      items: normalize(data.items || data.registrations || []),
      sections: data && data.sections ? normalizeSections(data.sections) : null,
    };
  }

  async function readRemoteBundle() {
    if (!bucket) return null;
    const res = await fetchWithTimeout(`${baseUrl}/${bucket}/${remoteKey}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { items: [], sections: null };
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Store HTTP ${res.status}`);
    }
    const data = await res.json();
    return parseRemotePayload(data);
  }

  async function writeRemote(list, sections) {
    if (!bucket) throw new Error("Store is not configured");
    const gates = writeLocalSections(sections || lastSections);
    const payload = {
      event: "International Conference of Orthodontic Society 2027",
      updatedAt: new Date().toISOString(),
      items: normalize(list),
      sections: gates,
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

  function finishList(items, source, error, sections) {
    const clean = withoutDeleted(items);
    const gates = writeLocalSections(sections || lastSections);
    syncTakenCache(clean);
    return { items: clean, source, error: error || "", sections: gates };
  }

  async function listRegistrations() {
    const local = withoutDeleted(readLocal());
    const localSections = readLocalSections();
    try {
      const remoteBundle = await readRemoteBundle();
      const remote = withoutDeleted(remoteBundle.items);
      const remoteSections = remoteBundle.sections;
      const sections = remoteSections || localSections;
      const onlyLocal = local.filter((row) => !remote.some((item) => item.ticketId && item.ticketId === row.ticketId));
      if (onlyLocal.length) {
        try {
          await writeRemote(mergeRows(onlyLocal, remote), sections);
          const synced = await readRemoteBundle();
          return finishList(
            withoutDeleted(synced.items),
            "shared",
            "",
            synced.sections || sections,
          );
        } catch (err) {
          return finishList(
            mergeRows(local, remote),
            remote.length ? "mixed" : "local",
            String(err.message || err),
            sections,
          );
        }
      }
      if (remote.length || remoteSections) {
        return finishList(remote, "shared", "", sections);
      }
      try {
        await writeRemote(remote, sections);
        return finishList(local, "shared", "", sections);
      } catch (err) {
        return finishList(local, "local", String(err.message || err), localSections);
      }
    } catch (err) {
      return finishList(local, "local", String(err.message || err), localSections);
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
    let remoteSections = null;
    let remoteError = "";
    try {
      const bundle = await readRemoteBundle();
      remote = withoutDeleted(bundle.items);
      remoteSections = bundle.sections;
      if (remote.some((item) => item.seat === row.seat)) {
        throw new Error("This seat was just taken by another attendee.");
      }
    } catch (err) {
      if (String(err.message || err).includes("just taken")) throw err;
      remoteError = String(err.message || err);
    }

    const gates = normalizeSections(remoteSections || lastSections);
    const section = sectionForSeat(row.seat);
    if (section && gates[section] === false) {
      throw new Error("This section is not open for booking.");
    }

    const local = readLocal();
    if (local.some((item) => item.seat === row.seat && item.ticketId !== row.ticketId)) {
      throw new Error("This seat is already registered on this device.");
    }
    writeLocal([row, ...local.filter((item) => item.ticketId !== row.ticketId)]);

    if (remote) {
      try {
        await writeRemote([row, ...remote], gates);
        return { saved: true, source: "shared", sections: gates };
      } catch (err) {
        return { saved: true, source: "local", error: String(err.message || err), sections: gates };
      }
    }
    writeLocalSections(gates);
    return { saved: true, source: "local", error: remoteError, sections: gates };
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
      const bundle = await readRemoteBundle();
      if (bundle) {
        const nextRemote = withoutDeleted(bundle.items.filter((row) => {
          if (ticketId && row.ticketId === ticketId) return false;
          if (target.ticketId && row.ticketId === target.ticketId) return false;
          if (!ticketId && seat && row.seat === seat) return false;
          return true;
        }));
        await writeRemote(nextRemote, bundle.sections || lastSections);
      }
    } catch {
      /* silent local fallback */
    }

    syncTakenCache(nextLocal);
    return { deleted: true, items: nextLocal, sections: lastSections };
  }

  async function setSectionOpen(section, open) {
    if (!SECTION_IDS.includes(section)) {
      throw new Error("Unknown section");
    }
    const result = await listRegistrations();
    const next = { ...normalizeSections(result.sections), [section]: Boolean(open) };
    writeLocalSections(next);
    try {
      const bundle = await readRemoteBundle();
      const remoteItems = bundle ? withoutDeleted(bundle.items) : [];
      const items = mergeRows(result.items, remoteItems);
      await writeRemote(items, next);
      return { saved: true, source: "shared", sections: next };
    } catch (err) {
      return { saved: true, source: "local", error: String(err.message || err), sections: next };
    }
  }

  function friendlyError(error) {
    let text = String(error || "").trim();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string") text = parsed.message;
    } catch {
      /* keep original */
    }
    if (/email address not verified/i.test(text)) {
      return "the shared list host has not verified this account";
    }
    if (/aborted|timeout|Failed to fetch|NetworkError/i.test(text)) {
      return "the shared list did not respond in time";
    }
    text = text
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/[{}"\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 140) text = `${text.slice(0, 137)}...`;
    return text || "the shared list could not be reached";
  }

  window.CCStore = {
    listRegistrations,
    addRegistration,
    deleteRegistration,
    setSectionOpen,
    friendlyError,
    DEFAULT_SECTIONS,
    takenSeats: async () => {
      const { items } = await listRegistrations();
      return new Set(items.map((item) => item.seat));
    },
  };
})();
