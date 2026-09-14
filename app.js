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
    formStatus: document.getElementById("form-status"),
    createBtn: document.getElementById("create-ticket-btn"),
    backToSeats: document.getElementById("back-to-seats"),
    tName: document.getElementById("t-name"),
    tSeat: document.getElementById("t-seat"),
    tCat: document.getElementById("t-cat"),
    tId: document.getElementById("t-id"),
    downloadBtn: document.getElementById("download-btn"),
    shareBtn: document.getElementById("share-btn"),
    newBooking: document.getElementById("new-booking"),
    pills: document.querySelectorAll("[data-step-pill]"),
    hallStatus: document.getElementById("hall-status"),
    ticketStatus: document.getElementById("ticket-status"),
    openSeats: document.getElementById("open-seats"),
    totalSeats: document.getElementById("total-seats"),
  };

  const TAKEN_CACHE = "cc2026-taken-cache";

  const state = {
    selected: null,
    ticket: null,
    pdfDoc: null,
    taken: new Set(),
    saveNote: "",
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

  function updateOpenCount() {
    const seats = [...els.blocks.querySelectorAll(".seat")];
    const total = seats.length || 200;
    const takenHere = seats.filter((btn) => state.taken.has(btn.dataset.code)).length;
    if (els.totalSeats) els.totalSeats.textContent = String(total);
    if (els.openSeats) els.openSeats.textContent = String(Math.max(0, total - takenHere));
  }

  function paintSeats() {
    els.blocks.querySelectorAll(".seat").forEach((btn) => {
      const taken = state.taken.has(btn.dataset.code);
      btn.classList.toggle("taken", taken);
      btn.disabled = taken;
      if (taken) {
        btn.setAttribute("aria-disabled", "true");
        btn.title = `${btn.dataset.code} · taken`;
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
    updateOpenCount();
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
      els.selectedCode.textContent = "None";
      els.selectedMeta.textContent = "Click a seat on the chart.";
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

  function setCreating(on) {
    if (!els.createBtn) return;
    els.createBtn.disabled = on;
    els.createBtn.textContent = on ? "Creating ticket..." : "Create ticket";
    if (els.formStatus) {
      els.formStatus.textContent = on ? "Building the ticket PDF and saving the seat." : "";
    }
  }

  async function createTicket(name) {
    state.ticket = {
      name,
      seat: state.selected,
      id: makeTicketId(),
    };
    state.saveNote = "";
    els.tName.textContent = state.ticket.name;
    els.tSeat.textContent = state.ticket.seat.code;
    els.tCat.textContent = categoryLabel(state.ticket.seat.category);
    els.tId.textContent = state.ticket.id;

    try {
      const save = await window.CCStore.addRegistration({
        name,
        seat: state.ticket.seat.code,
        category: categoryLabel(state.ticket.seat.category),
        ticketId: state.ticket.id,
        createdAt: new Date().toISOString(),
      });
      if (save && save.source === "local") {
        state.saveNote = "Ticket is ready. It is saved on this device. The shared list could not be updated.";
      } else if (save && save.source === "shared") {
        state.saveNote = "Ticket is ready and saved to the shared list.";
      }
    } catch (err) {
      const message = String(err.message || err);
      if (/just taken|already registered/i.test(message)) {
        els.formError.textContent = `${message} Pick another seat.`;
        if (window.CCStore) {
          try {
            replaceTaken(await window.CCStore.takenSeats());
          } catch {
            addTaken([state.ticket.seat.code]);
          }
        }
        state.ticket = null;
        state.pdfDoc = null;
        showStep(1);
        return;
      }
      const why = window.CCStore.friendlyError
        ? window.CCStore.friendlyError(message)
        : message;
      state.saveNote = `Ticket preview is ready. Registration may not have reached the shared list (${why}).`;
    }

    addTaken([state.ticket.seat.code]);
    if (window.CCStore) {
      window.CCStore.takenSeats().then(replaceTaken).catch(() => {});
    }

    try {
      await buildPdf();
    } catch (err) {
      state.pdfDoc = null;
      if (els.ticketStatus) {
        els.ticketStatus.textContent = `${state.saveNote ? `${state.saveNote} ` : ""}The PDF could not be built (${String(err.message || err)}). Try Download ticket again.`;
      }
      showStep(3);
      return;
    }

    if (els.ticketStatus) els.ticketStatus.textContent = state.saveNote;
    showStep(3);
  }

  async function ensurePdf() {
    if (state.pdfDoc) return state.pdfDoc;
    if (!state.ticket) return null;
    return buildPdf();
  }

  async function downloadPdf() {
    try {
      const doc = await ensurePdf();
      if (!doc || !state.ticket) {
        if (els.ticketStatus) els.ticketStatus.textContent = "The PDF is not ready yet. Go back and create the ticket again.";
        return;
      }
      doc.save(window.CCTicket.fileName(state.ticket.seat.code, state.ticket.id));
    } catch (err) {
      if (els.ticketStatus) els.ticketStatus.textContent = `Download failed. ${String(err.message || err)}`;
    }
  }

  async function sharePdf() {
    try {
      const doc = await ensurePdf();
      if (!doc || !state.ticket) {
        if (els.ticketStatus) els.ticketStatus.textContent = "The PDF is not ready yet. Go back and create the ticket again.";
        return;
      }
      await window.CCTicket.shareTicketPdf(doc, {
        name: state.ticket.name,
        seat: state.ticket.seat.code,
        id: state.ticket.id,
      });
    } catch (err) {
      if (els.ticketStatus) els.ticketStatus.textContent = `Share failed. ${String(err.message || err)}`;
    }
  }

  async function refreshTaken(initial) {
    if (!window.CCStore) {
      if (els.hallStatus) els.hallStatus.textContent = "Seat list is stored on this device only.";
      return;
    }
    if (initial && els.hallStatus) {
      els.hallStatus.textContent = "Checking which seats are already taken.";
    }
    try {
      const result = await window.CCStore.listRegistrations();
      replaceTaken(result.items.map((item) => item.seat));
      if (!els.hallStatus) return;
      if (result.error) {
        const why = window.CCStore.friendlyError
          ? window.CCStore.friendlyError(result.error)
          : result.error;
        els.hallStatus.textContent = `Taken seats on this device are marked red. Shared list unavailable: ${why}.`;
      } else if (result.source === "local") {
        els.hallStatus.textContent = "Showing booked seats saved on this device.";
      } else {
        els.hallStatus.textContent = "Taken seats are marked red.";
      }
    } catch (err) {
      if (els.hallStatus) {
        const why = window.CCStore.friendlyError
          ? window.CCStore.friendlyError(err.message || err)
          : String(err.message || err);
        els.hallStatus.textContent = `Could not refresh taken seats (${why}). Booked seats already on this device stay red.`;
      }
    }
  }

  els.blocks.addEventListener("click", (event) => {
    const seat = event.target.closest(".seat");
    if (!seat) return;
    selectSeat(seat.dataset.code);
  });

  els.nextBtn.addEventListener("click", () => {
    if (!state.selected) return;
    els.formError.textContent = "";
    if (els.formStatus) els.formStatus.textContent = "";
    showStep(2);
    els.doctorName.focus();
  });

  els.backToSeats.addEventListener("click", () => showStep(1));

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = els.doctorName.value.trim();
    if (name.length < 2) {
      els.formError.textContent = "Full name is required.";
      els.doctorName.focus();
      return;
    }
    els.formError.textContent = "";
    setCreating(true);
    try {
      await createTicket(name);
    } finally {
      setCreating(false);
    }
  });

  els.downloadBtn.addEventListener("click", downloadPdf);
  els.shareBtn.addEventListener("click", sharePdf);
  els.newBooking.addEventListener("click", () => {
    state.ticket = null;
    state.pdfDoc = null;
    state.saveNote = "";
    els.doctorName.value = "";
    if (els.ticketStatus) els.ticketStatus.textContent = "";
    showStep(1);
  });

  loadTakenCache();
  hall.renderHall(els.blocks);
  paintSeats();
  refreshTaken(true);
})();
