(() => {
  const BLOCKS = [
    { id: "B", name: "Front Left", category: "standard", rows: 2, cols: 4 },
    { id: "A", name: "Front Center", category: "premium", rows: 2, cols: 8 },
    { id: "C", name: "Front Right", category: "standard", rows: 2, cols: 4 },
    { id: "D", name: "Middle Left", category: "premium", rows: 3, cols: 6 },
    { id: "E", name: "Middle Center", category: "premium", rows: 3, cols: 8 },
    { id: "F", name: "Middle Right", category: "premium", rows: 3, cols: 6 },
    { id: "G", name: "Rear Left", category: "standard", rows: 3, cols: 6 },
    { id: "H", name: "Rear Center", category: "standard", rows: 3, cols: 6 },
    { id: "I", name: "Rear Right", category: "standard", rows: 3, cols: 6 },
    { id: "J", name: "Back Left", category: "standard", rows: 3, cols: 6 },
    { id: "K", name: "Back Center", category: "standard", rows: 3, cols: 6 },
    { id: "L", name: "Back Right", category: "standard", rows: 3, cols: 6 },
  ];

  const ORDER = ["B", "A", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const blockById = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

  const els = {
    blocks: document.getElementById("blocks"),
    legend: document.getElementById("legend"),
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
    waBtn: document.getElementById("wa-btn"),
    shareBtn: document.getElementById("share-btn"),
    newBooking: document.getElementById("new-booking"),
    pills: document.querySelectorAll("[data-step-pill]"),
  };

  const state = {
    selected: null,
    ticket: null,
    pdfDoc: null,
  };

  function seatCount(block) {
    return block.rows * block.cols;
  }

  function categoryLabel(category) {
    return category === "premium" ? "Gold / Premium" : "Navy / Standard";
  }

  function renderLegend() {
    const html = ORDER.map((id) => {
      const block = blockById[id];
      return `
        <div class="legend-item">
          <span class="swatch ${block.category === "premium" ? "gold" : "navy"}"></span>
          <span><strong>${id}</strong> · ${block.name}</span>
          <span class="legend-meta">${seatCount(block)} kursi</span>
        </div>`;
    }).join("");
    els.legend.insertAdjacentHTML("afterbegin", html);
  }

  function renderSeats() {
    let total = 0;
    ORDER.forEach((id) => {
      const block = blockById[id];
      const wrap = document.createElement("div");
      wrap.className = "block";
      wrap.dataset.block = id;

      const label = document.createElement("div");
      label.className = "block-label";
      label.textContent = id;
      wrap.appendChild(label);

      const grid = document.createElement("div");
      grid.className = "seats";
      grid.style.gridTemplateColumns = `repeat(${block.cols}, auto)`;

      let n = 0;
      for (let r = 0; r < block.rows; r += 1) {
        for (let c = 0; c < block.cols; c += 1) {
          n += 1;
          total += 1;
          const code = `${id}-${String(n).padStart(2, "0")}`;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `seat ${block.category}`;
          btn.dataset.code = code;
          btn.dataset.block = id;
          btn.dataset.category = block.category;
          btn.setAttribute("aria-label", `Kursi ${code}, ${categoryLabel(block.category)}`);
          btn.setAttribute("aria-pressed", "false");
          btn.title = code;
          grid.appendChild(btn);
        }
      }

      wrap.appendChild(grid);
      els.blocks.appendChild(wrap);
    });

    if (total !== 200) {
      console.error(`Expected 200 seats, rendered ${total}`);
    }
    els.blocks.dataset.totalSeats = String(total);
  }

  function markTaken(seats) {
    els.blocks.querySelectorAll(".seat").forEach((btn) => {
      const taken = seats.has(btn.dataset.code);
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
      }
    });
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
    return `CC-2026-${rand}${time}`;
  }

  function ticketPayload() {
    return {
      event: "Conference with CC 2026",
      name: state.ticket.name,
      seat: state.ticket.seat.code,
      category: categoryLabel(state.ticket.seat.category),
      date: "Conference with CC 2026",
      id: state.ticket.id,
    };
  }

  function ticketText() {
    const t = ticketPayload();
    return [
      "Conference with CC 2026",
      `Nama Dokter: ${t.name}`,
      `Kursi: ${t.seat} (${t.category})`,
      `Ticket ID: ${t.id}`,
      "A Brighter Tomorrow Together",
    ].join("\n");
  }

  function waUrl() {
    return `https://wa.me/?text=${encodeURIComponent(ticketText())}`;
  }

  function makeQrDataUrl(text) {
    return new Promise((resolve, reject) => {
      const holder = document.createElement("div");
      holder.style.cssText = "position:absolute;left:-9999px;top:0;";
      document.body.appendChild(holder);
      try {
        const qr = new QRCode(holder, {
          text,
          width: 220,
          height: 220,
          colorDark: "#0c1b33",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M,
        });
        const grab = () => {
          const img = holder.querySelector("img");
          const canvas = holder.querySelector("canvas");
          let url = "";
          if (canvas) url = canvas.toDataURL("image/png");
          else if (img && img.src) url = img.src;
          holder.remove();
          if (!url) reject(new Error("QR tidak terbuat"));
          else resolve(url);
        };
        requestAnimationFrame(() => setTimeout(grab, 40));
        void qr;
      } catch (err) {
        holder.remove();
        reject(err);
      }
    });
  }

  async function buildPdf() {
    const t = ticketPayload();
    const qr = await makeQrDataUrl(`${t.event}|${t.id}|${t.seat}|${t.name}`);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [210, 100] });

    doc.setFillColor(244, 239, 228);
    doc.rect(0, 0, 210, 100, "F");

    doc.setFillColor(12, 27, 51);
    doc.rect(0, 0, 68, 100, "F");

    doc.setFillColor(198, 162, 78);
    doc.rect(68, 0, 2.2, 100, "F");
    doc.rect(0, 0, 210, 3, "F");
    doc.rect(0, 97, 210, 3, "F");

    doc.setTextColor(216, 182, 90);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.text("CONNECT  •  LEARN  •  GROW TOGETHER", 8, 14);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Conference", 8, 28);
    doc.text("with CC", 8, 35);

    doc.setFontSize(8);
    doc.setFont("times", "italic");
    doc.text("A Brighter Tomorrow Together", 8, 44);

    doc.addImage(qr, "PNG", 12, 54, 36, 36);

    doc.setTextColor(12, 27, 51);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("ADMIT ONE  ·  PREMIUM TICKET", 80, 16);

    doc.setFontSize(8);
    doc.setTextColor(92, 102, 118);
    doc.setFont("helvetica", "normal");
    const rows = [
      ["NAMA DOKTER", t.name],
      ["KODE KURSI", t.seat],
      ["KATEGORI", t.category],
      ["TANGGAL", t.date],
      ["TICKET ID", t.id],
    ];
    let y = 30;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(92, 102, 118);
      doc.text(label, 80, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(12, 27, 51);
      doc.text(String(value), 80, y + 6);
      y += 14;
    });

    doc.setDrawColor(198, 162, 78);
    doc.setLineWidth(0.3);
    doc.line(80, 22, 198, 22);

    state.pdfDoc = doc;
    return doc;
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
      const qr = await makeQrDataUrl(`${state.ticket.id}|${state.ticket.seat.code}|${name}`);
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
      const saved = await window.CCStore.addRegistration({
        name,
        seat: state.ticket.seat.code,
        category: categoryLabel(state.ticket.seat.category),
        ticketId: state.ticket.id,
        createdAt: new Date().toISOString(),
      });
      state.saveSource = saved.source;
    } catch (err) {
      console.warn(err);
    }
    showStep(3);
  }

  function fileName() {
    return `Conference-CC-2026-${state.ticket.seat.code}-${state.ticket.id}.pdf`;
  }

  function downloadPdf() {
    if (!state.pdfDoc) return;
    state.pdfDoc.save(fileName());
  }

  async function shareTicket() {
    const text = ticketText();
    if (!state.pdfDoc) await buildPdf();
    const blob = state.pdfDoc.output("blob");
    const file = new File([blob], fileName(), { type: "application/pdf" });

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Conference with CC", text, files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Conference with CC", text });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    downloadPdf();
    window.open(waUrl(), "_blank", "noopener");
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
  els.waBtn.addEventListener("click", () => {
    window.open(waUrl(), "_blank", "noopener");
  });
  els.shareBtn.addEventListener("click", shareTicket);
  els.newBooking.addEventListener("click", () => {
    state.ticket = null;
    state.pdfDoc = null;
    els.doctorName.value = "";
    showStep(1);
  });

  if (!navigator.share) {
    els.shareBtn.classList.add("hidden");
  }

  const legendDetails = document.getElementById("legend-details");
  if (legendDetails && window.matchMedia("(max-width: 720px)").matches) {
    legendDetails.open = false;
  }

  renderLegend();
  renderSeats();
  if (window.CCStore) {
    window.CCStore.takenSeats().then(markTaken).catch(() => {});
  }
})();
