(() => {
  const PASS = (window.CC_CONFIG && window.CC_CONFIG.adminPassword) || "cc2026";
  const AUTH_KEY = "cc-admin-ok";

  const els = {
    gate: document.getElementById("gate"),
    dash: document.getElementById("dash"),
    form: document.getElementById("gate-form"),
    pass: document.getElementById("admin-pass"),
    error: document.getElementById("gate-error"),
    rows: document.getElementById("rows"),
    status: document.getElementById("store-status"),
    count: document.getElementById("count-line"),
    filter: document.getElementById("filter"),
    refresh: document.getElementById("refresh-btn"),
    exportBtn: document.getElementById("export-btn"),
    logout: document.getElementById("logout-btn"),
  };

  let cache = [];

  function unlocked() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function showDash(on) {
    els.gate.classList.toggle("hidden", on);
    els.dash.classList.toggle("hidden", !on);
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

  function render() {
    const q = (els.filter.value || "").trim().toLowerCase();
    const rows = cache.filter((row) => {
      if (!q) return true;
      return [row.name, row.seat, row.ticketId, row.category].join(" ").toLowerCase().includes(q);
    });
    els.count.textContent = `${cache.length} pendaftar${q ? ` · ${rows.length} ditampilkan` : ""}`;
    if (!rows.length) {
      els.rows.innerHTML = `<tr><td colspan="6">${cache.length ? "Tidak ada hasil." : "Belum ada pendaftar."}</td></tr>`;
      return;
    }
    els.rows.innerHTML = rows.map((row, idx) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td><strong>${escapeHtml(row.seat)}</strong></td>
        <td>${escapeHtml(row.category || "—")}</td>
        <td>${escapeHtml(formatWhen(row.createdAt))}</td>
        <td class="mono">${escapeHtml(row.ticketId || "—")}</td>
        <td>
          <button class="btn btn-gold btn-compact" type="button" data-pdf-index="${idx}">Bagikan PDF</button>
        </td>
      </tr>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function load() {
    els.status.textContent = "Memuat data…";
    const result = await window.CCStore.listRegistrations();
    cache = result.items;
    if (result.source === "shared") {
      els.status.textContent = "Penyimpanan bersama (KVdb) · pendaftaran dari HP peserta tampil di sini.";
    } else if (result.source === "mixed") {
      els.status.textContent = "Sebagian data dari store bersama; sisanya masih lokal di browser ini.";
    } else {
      els.status.textContent = result.error
        ? `Data di browser ini. Store bersama belum bisa menulis (${result.error.trim()}). Buka kvdb.io/login untuk aktivasi email.`
        : "Penyimpanan lokal di browser ini saja — perangkat lain tidak melihat data ini.";
    }
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

  async function downloadRowPdf(row) {
    const doc = await window.CCTicket.buildTicketPdf({
      name: row.name,
      seat: row.seat,
      category: row.category || "—",
      id: row.ticketId || "CC-2027",
    });
    doc.save(window.CCTicket.fileName(row.seat, row.ticketId || "ticket"));
  }

  function csv(value) {
    const text = String(value || "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
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
    load();
  });

  els.rows.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-pdf-index]");
    if (!btn) return;
    const q = (els.filter.value || "").trim().toLowerCase();
    const rows = cache.filter((row) => {
      if (!q) return true;
      return [row.name, row.seat, row.ticketId, row.category].join(" ").toLowerCase().includes(q);
    });
    const row = rows[Number(btn.dataset.pdfIndex)];
    if (!row) return;
    btn.disabled = true;
    try {
      await downloadRowPdf(row);
    } finally {
      btn.disabled = false;
    }
  });

  els.filter.addEventListener("input", render);
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
    load();
  }
})();
