(() => {
  const EVENT = {
    name: "International Conference of Orthodontic Society 2027",
    short: "ICOS 2027",
    cc: "CC 2027",
    tagline: "CONNECT • LEARN • GROW TOGETHER",
  };

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
          const canvas = holder.querySelector("canvas");
          const img = holder.querySelector("img");
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

  function fileName(seat, ticketId) {
    return `ICOS-2027-${seat}-${ticketId}.pdf`;
  }

  async function buildTicketPdf({ name, seat, category, id }) {
    const qr = await makeQrDataUrl(`${EVENT.name}|${id}|${seat}|${name}`);
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
    doc.setFontSize(7.5);
    doc.text(EVENT.tagline, 8, 14);

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("International", 8, 26);
    doc.text("Conference of", 8, 32);
    doc.text("Orthodontic Society", 8, 38);
    doc.setFontSize(14);
    doc.text("CC 2027", 8, 46);

    doc.addImage(qr, "PNG", 12, 54, 36, 36);

    doc.setTextColor(12, 27, 51);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("ADMIT ONE  ·  ICOS 2027", 80, 16);

    const rows = [
      ["NAMA DOKTER", name],
      ["KODE KURSI", seat],
      ["KATEGORI", category || "—"],
      ["ACARA", EVENT.name],
      ["TICKET ID", id],
    ];
    let y = 28;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(92, 102, 118);
      doc.text(label, 80, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(12, 27, 51);
      const lines = doc.splitTextToSize(String(value), 118);
      doc.text(lines, 80, y + 5);
      y += 13;
    });

    doc.setDrawColor(198, 162, 78);
    doc.setLineWidth(0.3);
    doc.line(80, 20, 198, 20);
    return doc;
  }

  function shareText({ name, seat, id }) {
    return [
      EVENT.name,
      `${EVENT.short} · ${EVENT.cc}`,
      `Nama Dokter: ${name}`,
      `Kursi: ${seat}`,
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
    try {
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank", "noopener");
    } catch {
      /* ignore popup blockers */
    }
    doc.save(filename);
    return "downloaded";
  }

  window.CCTicket = { EVENT, makeQrDataUrl, buildTicketPdf, fileName, shareTicketPdf, shareText };
})();

