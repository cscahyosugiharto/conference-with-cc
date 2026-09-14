(() => {
  const PASS = (window.CC_CONFIG && window.CC_CONFIG.adminPassword) || "cc2026";
  const AUTH_KEY = "cc-admin-ok";
  const hall = window.CCHall;

  const els = {
    gate: document.getElementById("gate"),
    dash: document.getElementById("dash"),
    form: document.getElementById("gate-form"),
    pass: document.getElementById("admin-pass"),
    error: document.getElementById("gate-error"),
    rows: document.getElementById("rows"),
    count: document.getElementById("count-line"),
    filter: document.getElementById("filter"),
    refresh: document.getElementById("refresh-btn"),
    exportBtn: document.getElementById("export-btn"),
    logout: document.getElementById("logout-btn"),
    blocks: document.getElementById("admin-blocks"),
    seatCode: document.getElementById("admin-seat-code"),
    seatMeta: document.getElementById("admin-seat-meta"),
    seatActions: document.getElementById("admin-seat-actions"),
    seatPdf: document.getElementById("admin-seat-pdf"),
    seatDelete: document.getElementById("admin-seat-delete"),
    dashStatus: document.getElementById("dash-status"),
    openSeats: document.getElementById("admin-open-seats"),
    totalSeats: document.getElementById("admin-total-seats"),
  };

  let cache = [];
  let inspect = null;

  function unlocked() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function showDash(on) {
    els.gate.classList.toggle("hidden", on);
    els.dash.classList.toggle("hidden", !on);
    els.logout.classList.toggle("hidden", !on);
    document.body.classList.toggle("admin-unlocked", on);
  }

  function formatWhen(iso) {
    if (!iso) return "Not recorded";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bySeat(code) {
    return cache.find((row) => row.seat === code) || null;
  }

  function byTicket(id) {
    return cache.find((row) => row.ticketId === id) || null;
  }

  function filteredRows() {
    const q = (els.filter.value || "").trim().toLowerCase();
    return cache.filter((row) => {
      if (!q) return true;
      return [row.name, row.seat, row.ticketId, row.category].join(" ").toLowerCase().includes(q);
    });
  }

  function actionButtons(row) {
    const id = escapeHtml(row.ticketId || row.seat);
    return `
      <div class="admin-row-actions">
        <button class="btn btn-gold btn-compact" type="button" data-act="pdf" data-id="${id}">Share PDF</button>
        <button class="btn btn-danger btn-compact" type="button" data-act="del" data-id="${id}">Delete</button>
      </div>
    `;
  }

  function emptyMessage() {
    if (!cache.length) {
      return "No registrations yet. Seats booked on the public chart will appear here after Refresh.";
    }
    return "No registrations match this search. Clear the search to see the full list.";
  }

  function renderTable() {
    const rows = filteredRows();
    els.count.textContent = `${cache.length} registration${cache.length === 1 ? "" : "s"}${els.filter.value.trim() ? ` · ${rows.length} shown` : ""}`;
    if (!rows.length) {
      els.rows.innerHTML = `<tr class="empty-row"><td colspan="6">${emptyMessage()}</td></tr>`;
      return;
    }
    els.rows.innerHTML = rows.map((row) => `
      <tr>
        <td data-label="Full Name">${escapeHtml(row.name)}</td>
        <td data-label="Seat"><strong>${escapeHtml(row.seat)}</strong></td>
        <td data-label="Category">${escapeHtml(row.category || "Not set")}</td>
        <td data-label="Time">${escapeHtml(formatWhen(row.createdAt))}</td>
        <td class="mono" data-label="Ticket ID">${escapeHtml(row.ticketId || "Not set")}</td>
        <td data-label="Actions">${actionButtons(row)}</td>
      </tr>
    `).join("");
  }

  function updateOpenCount() {
    const seats = [...els.blocks.querySelectorAll(".seat")];
    const total = seats.length || 200;
    const takenHere = seats.filter((btn) => btn.classList.contains("taken")).length;
    if (els.totalSeats) els.totalSeats.textContent = String(total);
    if (els.openSeats) els.openSeats.textContent = String(Math.max(0, total - takenHere));
  }

  function paintHall() {
    const taken = new Set(cache.map((row) => row.seat));
    els.blocks.querySelectorAll(".seat").forEach((btn) => {
      const occupant = bySeat(btn.dataset.code);
      const isTaken = taken.has(btn.dataset.code);
      btn.classList.toggle("taken", isTaken);
      btn.disabled = false;
      btn.setAttribute("aria-pressed", inspect === btn.dataset.code ? "true" : "false");
      btn.title = occupant
        ? `${btn.dataset.code} · ${occupant.name}`
        : `${btn.dataset.code} · not yet booked`;
    });
    updateOpenCount();
  }

  function showInspect(code) {
    inspect = code;
    paintHall();
    const block = hall.blockById[code.split("-")[0]];
    const occupant = bySeat(code);
    els.seatCode.textContent = code;
    if (occupant) {
      els.seatMeta.innerHTML = [
        `<strong>${escapeHtml(occupant.name)}</strong>`,
        `${block ? block.name : ""} · ${escapeHtml(occupant.category || hall.categoryLabel(block && block.category))}`,
        `Ticket ${escapeHtml(occupant.ticketId || "not set")}`,
        formatWhen(occupant.createdAt),
      ].filter(Boolean).join("<br>");
      els.seatActions.classList.remove("hidden");
      els.seatPdf.dataset.id = occupant.ticketId || occupant.seat;
      els.seatDelete.dataset.id = occupant.ticketId || occupant.seat;
    } else {
      els.seatMeta.textContent = "Not yet booked.";
      els.seatActions.classList.add("hidden");
    }
  }

  function render() {
    renderTable();
    paintHall();
    if (inspect) showInspect(inspect);
  }

  function setStatus(text) {
    if (els.dashStatus) els.dashStatus.textContent = text;
  }

  async function load() {
    setStatus("Loading registrations.");
    els.rows.innerHTML = `<tr class="empty-row"><td colspan="6">Loading registrations.</td></tr>`;
    try {
      const result = await window.CCStore.listRegistrations();
      cache = result.items;
      if (result.error) {
        const why = window.CCStore.friendlyError
          ? window.CCStore.friendlyError(result.error)
          : result.error;
        setStatus(`Showing the ${result.source || "local"} copy. Shared list unavailable: ${why}.`);
      } else if (result.source === "shared") {
        setStatus("Showing the shared registration list.");
      } else if (result.source === "mixed") {
        setStatus("Showing a mix of shared and on-device registrations.");
      } else {
        setStatus("Showing registrations saved on this device.");
      }
      render();
    } catch (err) {
      cache = [];
      setStatus(`Could not load registrations. ${String(err.message || err)} Try Refresh.`);
      els.rows.innerHTML = `<tr class="empty-row"><td colspan="6">Could not load registrations. Try Refresh.</td></tr>`;
      els.count.textContent = "0 registrations";
    }
  }

  function exportCsv() {
    if (!cache.length) {
      setStatus("There are no registrations to download.");
      return;
    }
    const header = ["Full Name", "Seat", "Category", "Time", "Ticket ID"];
    const lines = [header.join(",")].concat(cache.map((row) => [
      csv(row.name),
      csv(row.seat),
      csv(row.category),
      csv(row.createdAt),
      csv(row.ticketId),
    ].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "icos-2027-registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareRowPdf(row) {
    const doc = await window.CCTicket.buildTicketPdf({
      name: row.name,
      seat: row.seat,
      category: row.category || "Not set",
      id: row.ticketId || "CC-2027",
    });
    await window.CCTicket.shareTicketPdf(doc, {
      name: row.name,
      seat: row.seat,
      id: row.ticketId || "ticket",
    });
  }

  async function deleteRow(row) {
    const ok = window.confirm(`Delete the booking for seat ${row.seat} (${row.name})? The seat will become available again.`);
    if (!ok) return;
    await window.CCStore.deleteRegistration({ ticketId: row.ticketId, seat: row.seat });
    if (inspect === row.seat) {
      inspect = row.seat;
    }
    await load();
  }

  function csv(value) {
    const text = String(value || "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  async function handleAction(act, id, btn) {
    const row = byTicket(id) || cache.find((item) => item.seat === id);
    if (!row) return;
    if (btn) btn.disabled = true;
    try {
      if (act === "pdf") await shareRowPdf(row);
      if (act === "del") await deleteRow(row);
    } catch (err) {
      setStatus(`That action failed. ${String(err.message || err)}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.pass.value !== PASS) {
      els.error.textContent = "Incorrect password.";
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
    els.error.textContent = "";
    showDash(true);
    hall.renderHall(els.blocks);
    load();
  });

  els.rows.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    handleAction(btn.dataset.act, btn.dataset.id, btn);
  });

  els.blocks.addEventListener("click", (event) => {
    const seat = event.target.closest(".seat");
    if (!seat) return;
    showInspect(seat.dataset.code);
  });

  els.seatPdf.addEventListener("click", () => handleAction("pdf", els.seatPdf.dataset.id, els.seatPdf));
  els.seatDelete.addEventListener("click", () => handleAction("del", els.seatDelete.dataset.id, els.seatDelete));

  els.filter.addEventListener("input", renderTable);
  els.refresh.addEventListener("click", load);
  els.exportBtn.addEventListener("click", exportCsv);
  els.logout.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    showDash(false);
    els.pass.value = "";
    els.pass.focus();
  });

  if (unlocked()) {
    showDash(true);
    hall.renderHall(els.blocks);
    load();
  }
})();
