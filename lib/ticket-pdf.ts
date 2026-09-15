"use client";

import { EVENT, TICKET_BLANK_SRC, ticketFileName, ticketShareText, type TicketPayload } from "./ticket-copy";

const PAGE = { w: 210, h: 140 };
const FIELDS = {
  name: { x: 34.32, y: 56.46, w: 118.4, h: 5.61 },
  seat: { x: 34.32, y: 64.94, w: 118.4, h: 5.61 },
  category: { x: 34.45, y: 73.14, w: 118.26, h: 5.61 },
  event: { x: 34.32, y: 81.07, w: 118.4, h: 5.74 },
  id: { x: 34.32, y: 89.41, w: 118.26, h: 5.47 },
};

let blankDataUrl = "";

async function loadBlank(): Promise<string> {
  if (blankDataUrl) return blankDataUrl;
  const res = await fetch(TICKET_BLANK_SRC);
  if (!res.ok) throw new Error("Ticket template missing");
  const blob = await res.blob();
  blankDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return blankDataUrl;
}

type JsPdfDoc = {
  setFont: (n: string, s: string) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  getTextWidth: (t: string) => number;
  text: (t: string, x: number, y: number) => void;
  addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void;
  save: (name: string) => void;
  output: (type: "blob") => Blob;
};

function fillField(doc: JsPdfDoc, box: { x: number; y: number; w: number; h: number }, value: string, size: number) {
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

async function getJsPdf() {
  const mod = await import("jspdf");
  return mod.jsPDF;
}

export async function buildTicketPdf(payload: TicketPayload): Promise<JsPdfDoc> {
  const JsPDF = await getJsPdf();
  const blank = await loadBlank();
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: [PAGE.w, PAGE.h] }) as unknown as JsPdfDoc;
  doc.addImage(blank, "JPEG", 0, 0, PAGE.w, PAGE.h);
  fillField(doc, FIELDS.name, payload.name, 12);
  fillField(doc, FIELDS.seat, payload.seat, 12);
  fillField(doc, FIELDS.category, payload.category || "-", 12);
  fillField(doc, FIELDS.event, EVENT.name, 11);
  fillField(doc, FIELDS.id, payload.id, 11);
  return doc;
}

export async function shareTicketPdf(doc: JsPdfDoc, meta: TicketPayload): Promise<string> {
  const filename = ticketFileName(meta.seat, meta.id || "ticket");
  const text = ticketShareText(meta);
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `ICOS 2027 ${meta.seat}`, text });
      return "shared";
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ title: `ICOS 2027 ${meta.seat}`, text });
      doc.save(filename);
      return "shared-text";
    }
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
      return "aborted";
    }
  }
  doc.save(filename);
  return "downloaded";
}

export async function downloadTicketPdf(doc: JsPdfDoc, seat: string, ticketId: string) {
  doc.save(ticketFileName(seat, ticketId));
}
