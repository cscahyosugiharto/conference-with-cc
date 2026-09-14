(() => {
  const hall = window.CCHall;
  const { blockById, categoryLabel } = hall;

  const els = {
    blocks: document.getElementById("blocks"),
    selectedCode: document.getElementById("selected-code"),
    selectedMeta: document.getElementById("selected-meta"),
    nextBtn: document.getElementById("next-btn"),
    stepSeat: document.getElementById("step-seat"),
    stepForm: document.getElementById("step-form"),
    stepTicket: document.getElementById("step-ticket"),
    form: document.getElementById("doctor-form"),
    doctorName: document.getElementById("doctor-name"),
    formError: document.getElementById("form-error"),
    backToSeats: document.getElementById("back-to-seats"),
    tName: document.getElementById("t-name"),
    tSeat: document.getElementById("t-seat"),
    tCat: document.getElementById("t-cat"),
    tId: document.getElementById("t-id"),
    qrPreview: document.getElementById("qr-preview"),
    downloadBtn: document.getElementById("download-btn"),
    shareBtn: document.getElementById("share-btn"),
    newBooking: document.getElementById("new-booking"),
    pills: document.querySelectorAll("[data-step-pill]"),
  };

  const TAKEN_CACHE = "cc2026-taken-cache";

  const state = {
    selected: null,
    ticket: null,
    pdfDoc: null,
    taken: new Set(),
  };

  function persistTakenCache() {
    try {
      localStorage.setItem(TAKEN_CACHE, JSON.stringify([...state.taken]));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function loadTakenCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(TAKEN_CACHE) || "[]");
      if (Array.isArray(raw)) raw.forEach((id) => state.taken.add(id));
    } catch {
      /* ignore bad cache */
    }
  }

  function paintSeats() {
    els.blocks.querySelectorAll(".seat").forEach((btn) => {
      const taken = state.taken.has(btn.dataset.code);
      btn.classList.toggle("taken", taken);
      btn.disabled = taken;
      if (taken) {
        btn.setAttribute("aria-disabled", "true");
        btn.title = `${btn.dataset.code} · sudah terisi`;
        if (btn.getAttribute("aria-pressed") === "true") {
          btn.setAttribute("aria-pressed", "false");
          state.selected = null;
          updateSelection();
        }
      } else {
        btn.removeAttribute("aria-disabled");
        btn.title = btn.dataset.code;
      }
    });
  }

  function addTaken(seats) {
    seats.forEach((code) => state.taken.add(code));
    persistTakenCache();
    paintSeats();
  }

  function replaceTaken(seats) {
    state.taken = new Set(seats);
    persistTakenCache();
    paintSeats();
  }

  function selectSeat(code) {
    const target = els.blocks.querySelector(`[data-code="${code}"]`);
    if (!target || target.disabled) return;
    const prev = els.blocks.querySelector('.seat[aria-pressed="true"]');
    if (prev && prev.dataset.code === code) {
      prev.setAttribute("aria-pressed", "false");
      state.selected = null;
    } else {
      if (prev) prev.setAttribute("aria-pressed", "false");
      const next = els.blocks.querySelector(`[data-code="${code}"]`);
      next.setAttribute("aria-pressed", "true");
      const block = blockById[next.dataset.block];
      state.selected = {
        code,
        block: block.id,
        name: block.name,
        category: block.category,
      };
    }
    updateSelection();
  }

  function updateSelection() {
    if (!state.selected) {
      els.selectedCode.textContent = "—";
      els.selectedMeta.textContent = "Klik satu kursi di denah.";
      els.nextBtn.disabled = true;
      return;
    }
    els.selectedCode.textContent = state.selected.code;
    els.selectedMeta.textContent = `${state.selected.name} · ${categoryLabel(state.selected.category)}`;
    els.nextBtn.disabled = false;
  }

  function showStep(step) {
    els.stepSeat.classList.toggle("hidden", step !== 1);
    els.stepForm.classList.toggle("hidden", step !== 2);
    els.stepTicket.classList.toggle("hidden", step !== 3);
    els.pills.forEach((pill) => {
      const n = Number(pill.dataset.stepPill);
      if (n === step) pill.setAttribute("aria-current", "step");
      else pill.removeAttribute("aria-current");
    });
  }

  function makeTicketId() {
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    const time = Date.now().toString(36).toUpperCase().slice(-4);
    return `CC-2027-${rand}${time}`;
  }

  async function buildPdf() {
    state.pdfDoc = await window.CCTicket.buildTicketPdf({
      name: state.ticket.name,
      seat: state.ticket.seat.code,
      category: categoryLabel(state.ticket.seat.category),
      id: state.ticket.id,
    });
    return state.pdfDoc;
  }

  async function createTicket(name) {
    state.ticket = {
      name,
      seat: state.selected,
      id: makeTicketId(),
    };
    els.tName.textContent = state.ticket.name;
    els.tSeat.textContent = state.ticket.seat.code;
    els.tCat.textContent = categoryLabel(state.ticket.seat.category);
    els.tId.textContent = state.ticket.id;

    els.qrPreview.innerHTML = "";
    try {
      const qr = await window.CCTicket.makeQrDataUrl(`${state.ticket.id}|${state.ticket.seat.code}|${name}`);
      const img = document.createElement("img");
      img.alt = "Kode tiket";
      img.src = qr;
      els.qrPreview.appendChild(img);
    } catch (err) {
      console.warn(err);
      els.qrPreview.textContent = state.ticket.id;
    }

    await buildPdf();
    try {
      await window.CCStore.addRegistration({
        name,
        seat: state.ticket.seat.code,
        category: categoryLabel(state.ticket.seat.category),
        ticketId: state.ticket.id,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(err);
    }
    addTaken([state.ticket.seat.code]);
    if (window.CCStore) {
      window.CCStore.takenSeats().then(replaceTaken).catch(() => {});
    }
    showStep(3);
  }

  function downloadPdf() {
    if (!state.pdfDoc) return;
    state.pdfDoc.save(window.CCTicket.fileName(state.ticket.seat.code, state.ticket.id));
  }

  async function sharePdf() {
    if (!state.pdfDoc || !state.ticket) return;
    await window.CCTicket.shareTicketPdf(state.pdfDoc, {
      name: state.ticket.name,
      seat: state.ticket.seat.code,
      id: state.ticket.id,
    });
  }

  els.blocks.addEventListener("click", (event) => {
    const seat = event.target.closest(".seat");
    if (!seat) return;
    selectSeat(seat.dataset.code);
  });

  els.nextBtn.addEventListener("click", () => {
    if (!state.selected) return;
    els.formError.textContent = "";
    showStep(2);
    els.doctorName.focus();
  });

  els.backToSeats.addEventListener("click", () => showStep(1));

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = els.doctorName.value.trim();
    if (name.length < 2) {
      els.formError.textContent = "Nama Dokter wajib diisi.";
      els.doctorName.focus();
      return;
    }
    els.formError.textContent = "";
    await createTicket(name);
  });

  els.downloadBtn.addEventListener("click", downloadPdf);
  els.shareBtn.addEventListener("click", sharePdf);
  els.newBooking.addEventListener("click", () => {
    state.ticket = null;
    state.pdfDoc = null;
    els.doctorName.value = "";
    showStep(1);
  });

  loadTakenCache();
  hall.renderHall(els.blocks);
  paintSeats();
  if (window.CCStore) {
    window.CCStore.takenSeats().then(replaceTaken).catch(() => {});
  }
})();
