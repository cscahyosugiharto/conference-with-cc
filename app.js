(() => {
  const hall = window.CCHall;
  const { categoryLabel, seatInfo } = hall;
  const DEFAULT_SECTIONS = (window.CCStore && window.CCStore.DEFAULT_SECTIONS) || { gold: true, blue: false, gray: false };
  const MAX_TICKETS = 10;
  const $ = (id) => document.getElementById(id);

  const els = {
    blocks: $("blocks"),
    selectedCode: $("selected-code"),
    selectedMeta: $("selected-meta"),
    selCount: $("sel-count"),
    nextBtn: $("next-btn"),
    steps: { 1: $("step-qty"), 2: $("step-seat"), 3: $("step-form"), 4: $("step-ticket"), lookup: $("step-lookup") },
    stepper: document.querySelector(".steps"),
    qtyValue: $("qty-value"),
    form: $("doctor-form"),
    buyerName: $("buyer-name"),
    buyerEmail: $("buyer-email"),
    attendees: $("attendee-fields"),
    formError: $("form-error"),
    formStatus: $("form-status"),
    createBtn: $("create-ticket-btn"),
    ticketList: $("ticket-list"),
    ticketStatus: $("ticket-status"),
    lookupForm: $("lookup-form"),
    lookupEmail: $("lookup-email"),
    lookupError: $("lookup-error"),
    lookupBtn: $("lookup-btn"),
    lookupList: $("lookup-list"),
    pills: document.querySelectorAll("[data-step-pill]"),
    hallStatus: $("hall-status"),
    openSeats: $("open-seats"),
    totalSeats: $("total-seats"),
    legendStates: { gold: $("legend-gold-state"), blue: $("legend-blue-state"), gray: $("legend-gray-state") },
  };

  const state = { qty: 1, selected: [], taken: new Set(), sections: { ...DEFAULT_SECTIONS }, step: 1 };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const sectionOpen = (s) => state.sections[s] !== false;

  function updateLegend() {
    Object.entries(els.legendStates).forEach(([id, node]) => {
      if (!node) return;
      node.textContent = sectionOpen(id) ? "Open" : "Closed";
      node.classList.toggle("is-closed", !sectionOpen(id));
    });
  }

  function paintSeats() {
    const seats = [...els.blocks.querySelectorAll(".seat")];
    seats.forEach((btn) => {
      const code = btn.dataset.code;
      const taken = state.taken.has(code);
      const blocked = !sectionOpen(btn.dataset.category);
      btn.classList.toggle("taken", taken);
      btn.classList.toggle("blocked", blocked && !taken);
      btn.disabled = taken || blocked;
      if (taken || blocked) {
        btn.setAttribute("aria-disabled", "true");
        btn.title = `${code} · ${taken ? "taken" : "closed for registration"}`;
        if (state.selected.includes(code)) state.selected = state.selected.filter((c) => c !== code);
      } else {
        btn.removeAttribute("aria-disabled");
        btn.title = code;
      }
      btn.setAttribute("aria-pressed", state.selected.includes(code) ? "true" : "false");
    });
    updateLegend();
    if (els.totalSeats) els.totalSeats.textContent = String(seats.length);
    if (els.openSeats) els.openSeats.textContent = String(seats.filter((b) => !b.disabled).length);
    updateSelection();
  }

  function updateSelection() {
    const n = state.selected.length;
    els.selCount.textContent = `${n} of ${state.qty} selected`;
    els.selectedCode.textContent = n ? state.selected.join(", ") : "None";
    els.selectedMeta.textContent = n < state.qty
      ? `Tap ${state.qty - n} more seat${state.qty - n === 1 ? "" : "s"}. Tap a selected seat to deselect.`
      : "All seats chosen. Tap a selected seat to change it.";
    els.nextBtn.disabled = n !== state.qty;
  }

  function toggleSeat(code) {
    const btn = els.blocks.querySelector(`[data-code="${code}"]`);
    if (!btn || btn.disabled) return;
    if (state.selected.includes(code)) {
      state.selected = state.selected.filter((c) => c !== code);
    } else if (state.qty === 1) {
      state.selected = [code];
    } else if (state.selected.length < state.qty) {
      state.selected.push(code);
    } else {
      els.selectedMeta.textContent = `You already picked ${state.qty} seat${state.qty === 1 ? "" : "s"}. Deselect one first.`;
      return;
    }
    paintSeats();
  }

  function showStep(step) {
    state.step = step;
    Object.entries(els.steps).forEach(([k, node]) => node.classList.toggle("hidden", String(k) !== String(step)));
    els.stepper.classList.toggle("hidden", step === "lookup");
    els.pills.forEach((pill) => {
      if (Number(pill.dataset.stepPill) === step) pill.setAttribute("aria-current", "step");
      else pill.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setQty(n) {
    state.qty = Math.max(1, Math.min(MAX_TICKETS, n));
    els.qtyValue.textContent = String(state.qty);
    $("qty-minus").disabled = state.qty <= 1;
    $("qty-plus").disabled = state.qty >= MAX_TICKETS;
    if (state.selected.length > state.qty) state.selected = state.selected.slice(0, state.qty);
    updateSelection();
  }

  function renderAttendeeFields() {
    const prev = {};
    els.attendees.querySelectorAll("input").forEach((i) => { prev[i.dataset.seat] = i.value; });
    els.attendees.innerHTML = "";
    if (state.qty < 2) return;
    const h = document.createElement("h3");
    h.textContent = "Name on each ticket";
    els.attendees.appendChild(h);
    state.selected.forEach((code, i) => {
      const id = `att-${code}`;
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = `Seat ${code} · ${categoryLabel(seatInfo(code).category)}`;
      const input = document.createElement("input");
      Object.assign(input, { id, type: "text", maxLength: 80, autocomplete: "off", spellcheck: false });
      input.dataset.seat = code;
      input.placeholder = i === 0 ? "Same as Full Name if empty" : "Attendee full name";
      input.value = prev[code] || "";
      els.attendees.append(label, input);
    });
  }

  function ticketCard(t) {
    const wrap = document.createElement("article");
    wrap.className = "ticket-item";
    const card = document.createElement("div");
    card.className = "ticket-blank-wrap";
    card.innerHTML = `<img class="ticket-blank-img" src="assets/ticket-blank-v2.jpg" alt="International Conference of Orthodontic Society 2027 ticket">
      <p class="ticket-field tf-name"></p><p class="ticket-field tf-seat"></p><p class="ticket-field tf-cat"></p>
      <p class="ticket-field tf-event">International Conference of Orthodontic Society 2027</p><p class="ticket-field tf-id"></p>`;
    card.querySelector(".tf-name").textContent = t.name;
    card.querySelector(".tf-seat").textContent = t.seat;
    card.querySelector(".tf-cat").textContent = t.category;
    card.querySelector(".tf-id").textContent = t.ticketId;
    const actions = document.createElement("div");
    actions.className = "actions";
    const dl = document.createElement("button");
    dl.type = "button"; dl.className = "btn btn-gold"; dl.textContent = `Download ticket ${t.seat}`;
    const sh = document.createElement("button");
    sh.type = "button"; sh.className = "btn btn-ghost"; sh.textContent = "Share ticket PDF";
    const status = document.createElement("p");
    status.className = "status";
    let doc = null;
    const pdf = async () => doc || (doc = await window.CCTicket.buildTicketPdf({ name: t.name, seat: t.seat, category: t.category, id: t.ticketId }));
    dl.addEventListener("click", async () => {
      try { (await pdf()).save(window.CCTicket.fileName(t.seat, t.ticketId)); } catch (e) { status.textContent = `Download failed. ${e.message || e}`; }
    });
    sh.addEventListener("click", async () => {
      try { await window.CCTicket.shareTicketPdf(await pdf(), { name: t.name, seat: t.seat, id: t.ticketId }); } catch (e) { status.textContent = `Share failed. ${e.message || e}`; }
    });
    actions.append(dl, sh);
    wrap.append(card, actions, status);
    return wrap;
  }

  function renderTickets(container, tickets) {
    container.innerHTML = "";
    tickets.forEach((t) => container.appendChild(ticketCard(t)));
  }

  async function refreshTaken(initial) {
    if (initial && els.hallStatus) els.hallStatus.textContent = "Checking which seats are already taken.";
    try {
      const result = await window.CCStore.listRegistrations();
      if (result.sections) state.sections = { ...DEFAULT_SECTIONS, ...result.sections };
      state.taken = new Set(result.items.map((i) => i.seat));
      paintSeats();
      els.hallStatus.textContent = result.error
        ? `Could not load taken seats: ${window.CCStore.friendlyError(result.error)}.`
        : "Taken seats are marked red. Closed sections cannot be booked.";
    } catch (err) {
      paintSeats();
      els.hallStatus.textContent = `Could not refresh taken seats (${window.CCStore.friendlyError(err.message || err)}).`;
    }
  }

  // Events
  $("qty-minus").addEventListener("click", () => setQty(state.qty - 1));
  $("qty-plus").addEventListener("click", () => setQty(state.qty + 1));
  $("qty-next").addEventListener("click", () => { showStep(2); refreshTaken(false); });
  $("back-to-qty").addEventListener("click", () => showStep(1));
  els.blocks.addEventListener("click", (e) => {
    const seat = e.target.closest(".seat");
    if (seat) toggleSeat(seat.dataset.code);
  });
  els.nextBtn.addEventListener("click", () => {
    if (state.selected.length !== state.qty) return;
    els.formError.textContent = "";
    els.formStatus.textContent = "";
    renderAttendeeFields();
    showStep(3);
    els.buyerName.focus();
  });
  $("back-to-seats").addEventListener("click", () => showStep(2));

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const buyerName = els.buyerName.value.replace(/\s+/g, " ").trim();
    const email = els.buyerEmail.value.trim().toLowerCase();
    if (buyerName.length < 2) { els.formError.textContent = "Full name is required."; els.buyerName.focus(); return; }
    if (!EMAIL_RE.test(email)) { els.formError.textContent = "Please enter a valid email address."; els.buyerEmail.focus(); return; }
    const tickets = state.selected.map((seat) => {
      const input = els.attendees.querySelector(`input[data-seat="${seat}"]`);
      return { seat, name: (input && input.value.replace(/\s+/g, " ").trim()) || buyerName };
    });
    const bad = tickets.find((t) => t.name.length < 2);
    if (bad) { els.formError.textContent = `Enter a name for seat ${bad.seat}.`; return; }
    els.formError.textContent = "";
    els.createBtn.disabled = true;
    els.createBtn.textContent = "Booking...";
    els.formStatus.textContent = `Saving ${tickets.length} seat${tickets.length === 1 ? "" : "s"}.`;
    try {
      const res = await window.CCStore.bookSeats({ buyerName, email, tickets });
      res.tickets.forEach((t) => state.taken.add(t.seat));
      state.selected = [];
      paintSeats();
      renderTickets(els.ticketList, res.tickets);
      els.ticketStatus.textContent = `Booked ${res.tickets.length} ticket${res.tickets.length === 1 ? "" : "s"} for ${res.email}. Use Check Ticket with this email to find them again.`;
      showStep(4);
    } catch (err) {
      const msg = String(err.message || err);
      els.formError.textContent = msg;
      if (err.status === 409) {
        await refreshTaken(false);
        els.hallStatus.textContent = `${msg}`;
        showStep(2);
      }
    } finally {
      els.createBtn.disabled = false;
      els.createBtn.textContent = "Book tickets";
      els.formStatus.textContent = "";
    }
  });

  $("new-booking").addEventListener("click", () => {
    els.ticketList.innerHTML = "";
    els.ticketStatus.textContent = "";
    setQty(1);
    showStep(1);
  });

  $("check-ticket-btn").addEventListener("click", () => {
    els.lookupError.textContent = "";
    showStep("lookup");
    els.lookupEmail.focus();
  });
  $("lookup-back").addEventListener("click", () => showStep(1));
  els.lookupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = els.lookupEmail.value.trim().toLowerCase();
    els.lookupList.innerHTML = "";
    if (!EMAIL_RE.test(email)) { els.lookupError.textContent = "Please enter a valid email address."; return; }
    els.lookupError.textContent = "";
    els.lookupBtn.disabled = true;
    try {
      const tickets = await window.CCStore.lookupTickets(email);
      if (!tickets.length) els.lookupError.textContent = "No tickets found for this email.";
      else renderTickets(els.lookupList, tickets);
    } catch (err) {
      els.lookupError.textContent = String(err.message || err);
    } finally {
      els.lookupBtn.disabled = false;
    }
  });

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshTaken(false); });
  window.setInterval(() => refreshTaken(false), 20000);

  hall.renderHall(els.blocks);
  setQty(1);
  paintSeats();
  refreshTaken(true);
  if (location.hash === "#check") $("check-ticket-btn").click();
})();
