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
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("id-ID", {
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
        <button class="btn btn-gold btn-compact" type="button" data-act="pdf" data-id="${id}">Bagikan PDF</button>
        <button class="btn btn-danger btn-compact" type="button" data-act="del" data-id="${id}">Hapus</button>
      </div>
    `;
  }

  function renderTable() {
    const rows = filteredRows();
    els.count.textContent = `${cache.length} pendaftar${els.filter.value.trim() ? ` · ${rows.length} ditampilkan` : ""}`;
    if (!rows.length) {
      els.rows.innerHTML = `<tr><td colspan="6">${cache.length ? "Tidak ada hasil." : "Belum ada pendaftar."}</td></tr>`;
      return;
    }
    els.rows.innerHTML = rows.map((row) => `
      <tr>
        <td data-label="Nama Dokter">${escapeHtml(row.name)}</td>
        <td data-label="Kursi"><strong>${escapeHtml(row.seat)}</strong></td>
        <td data-label="Kategori">${escapeHtml(row.category || "—")}</td>
        <td data-label="Waktu">${escapeHtml(formatWhen(row.createdAt))}</td>
        <td class="mono" data-label="Ticket ID">${escapeHtml(row.ticketId || "—")}</td>
        <td data-label="Aksi">${actionButtons(row)}</td>
      </tr>
    `).join("");
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
        : `${btn.dataset.code} · belum terisi`;
    });
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
        `Ticket ${escapeHtml(occupant.ticketId || "—")}`,
        formatWhen(occupant.createdAt),
      ].filter(Boolean).join("<br>");
      els.seatActions.classList.remove("hidden");
      els.seatPdf.dataset.id = occupant.ticketId || occupant.seat;
      els.seatDelete.dataset.id = occupant.ticketId || occupant.seat;
    } else {
      els.seatMeta.textContent = "belum terisi";
      els.seatActions.classList.add("hidden");
    }
  }

  function render() {
    renderTable();
    paintHall();
    if (inspect) showInspect(inspect);
  }

  async function load() {
    const result = await window.CCStore.listRegistrations();
    cache = result.items;
    render();
  }

  function exportCsv() {
    const header = ["Nama Dokter", "Kursi", "Kategori", "Waktu", "Ticket ID"];
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
    a.download = "conference-cc-pendaftar.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareRowPdf(row) {
    const doc = await window.CCTicket.buildTicketPdf({
      name: row.name,
      seat: row.seat,
      category: row.category || "—",
      id: row.ticketId || "CC-2027",
    });
    await window.CCTicket.shareTicketPdf(doc, {
      name: row.name,
      seat: row.seat,
      id: row.ticketId || "ticket",
    });
  }

  async function deleteRow(row) {
    const ok = window.confirm(`Hapus pendaftaran ${row.seat} (${row.name})? Kursi akan tersedia lagi.`);
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
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.pass.value !== PASS) {
      els.error.textContent = "Kata sandi salah.";
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
