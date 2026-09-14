(() => {
  const EVENT = {
    name: "International Conference of Orthodontic Society 2027",
    short: "ICOS 2027",
    cc: "CC 2027",
    tagline: "SHAPING TOMORROW IN ORTHODONTICS",
  };

  const BLANK_SRC = "assets/ticket-blank-v2.jpg";
  const PAGE = { w: 210, h: 140 };
  const FIELDS = {
    name: { x: 34.32, y: 56.46, w: 118.40, h: 5.61 },
    seat: { x: 34.32, y: 64.94, w: 118.40, h: 5.61 },
    category: { x: 34.45, y: 73.14, w: 118.26, h: 5.61 },
    event: { x: 34.32, y: 81.07, w: 118.40, h: 5.74 },
    id: { x: 34.32, y: 89.41, w: 118.26, h: 5.47 },
  };

  let blankDataUrl = "";

  function loadBlank() {
    if (blankDataUrl) return Promise.resolve(blankDataUrl);
    return fetch(BLANK_SRC)
      .then((res) => {
        if (!res.ok) throw new Error("Ticket template missing");
        return res.blob();
      })
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          blankDataUrl = reader.result;
          resolve(blankDataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  function fillField(doc, box, value, size) {
    const text = String(value || "").trim() || "-";
    const pad = 1.8;
    const maxW = box.w - pad * 2;
    let fontSize = size;
    doc.setFont("times", "bold");
    doc.setTextColor(32, 20, 12);
    doc.setFontSize(fontSize);
    while (fontSize > 6.5 && doc.getTextWidth(text) > maxW) {
      fontSize -= 0.3;
      doc.setFontSize(fontSize);
    }
    const pt = fontSize * 0.352778;
    const baseline = box.y + (box.h + pt * 0.72) / 2;
    doc.text(text, box.x + pad, baseline);
  }

  function fileName(seat, ticketId) {
    return `ICOS-2027-${seat}-${ticketId}.pdf`;
  }

  async function buildTicketPdf({ name, seat, category, id }) {
    const blank = await loadBlank();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE.w, PAGE.h] });
    doc.addImage(blank, "JPEG", 0, 0, PAGE.w, PAGE.h);
    fillField(doc, FIELDS.name, name, 12);
    fillField(doc, FIELDS.seat, seat, 12);
    fillField(doc, FIELDS.category, category || "-", 12);
    fillField(doc, FIELDS.event, EVENT.name, 11);
    fillField(doc, FIELDS.id, id, 11);
    return doc;
  }

  function shareText({ name, seat, id }) {
    return [
      EVENT.name,
      `${EVENT.short} · ${EVENT.cc}`,
      `Full Name: ${name}`,
      `Seat Code: ${seat}`,
      `Ticket ID: ${id}`,
    ].join("\n");
  }

  async function shareTicketPdf(doc, meta) {
    const filename = fileName(meta.seat, meta.id || "ticket");
    const text = shareText(meta);
    const blob = doc.output("blob");
    const file = new File([blob], filename, { type: "application/pdf" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${EVENT.short} ${meta.seat}`,
          text,
        });
        return "shared";
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `${EVENT.short} ${meta.seat}`, text });
        doc.save(filename);
        return "shared-text";
      }
    } catch (err) {
      if (err && err.name === "AbortError") return "aborted";
    }
    doc.save(filename);
    return "downloaded";
  }

  window.CCTicket = { EVENT, BLANK_SRC, buildTicketPdf, fileName, shareTicketPdf, shareText, loadBlank };
})();
