"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingForm } from "@/components/BookingForm";
import { HallChart, HallShell, SeatLegend } from "@/components/HallChart";
import { TicketPreview } from "@/components/TicketPreview";
import { DEFAULT_COUNTRY_DIAL } from "@/lib/countries";
import { CATEGORY_LABEL, TOTAL_SEATS, categoryForSeat, parseSeat } from "@/lib/hall";
import { buildTicketPdf, downloadTicketPdf, shareTicketPdf } from "@/lib/ticket-pdf";
import { categoryDisplay } from "@/lib/ticket-copy";
import type { BookingResult, Gates, PublicHallState } from "@/lib/types";
import { DEFAULT_GATES } from "@/lib/types";
import { parseBooking, ValidationError } from "@/lib/validation";

type JsPdfDoc = Awaited<ReturnType<typeof buildTicketPdf>>;

type TicketState = {
  name: string;
  seat: string;
  category: string;
  id: string;
  email: string;
  whatsapp: string;
};

const emptyForm = {
  fullName: "",
  countryCode: DEFAULT_COUNTRY_DIAL,
  whatsapp: "",
  email: "",
};

function rowName(code: string): string {
  const parsed = parseSeat(code);
  if (!parsed) return code;
  const cat = categoryForSeat(code);
  if (cat === "gold") return `Gold row ${parsed.row}`;
  if (cat === "blue") return `Blue row ${parsed.row}`;
  return `Gray row ${parsed.row}`;
}

export function BookingApp({ initial }: { initial: PublicHallState }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [taken, setTaken] = useState<Set<string>>(() => new Set(initial.taken));
  const [gates, setGates] = useState<Gates>(initial.gates || DEFAULT_GATES);
  const [hallStatus, setHallStatus] = useState(initial.error || (initial.configured ? "" : initial.error));
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketState | null>(null);
  const [ticketStatus, setTicketStatus] = useState("");
  const [pdfDoc, setPdfDoc] = useState<JsPdfDoc | null>(null);

  const refreshHall = useCallback(async () => {
    try {
      const res = await fetch("/api/hall", { cache: "no-store" });
      const data = (await res.json()) as PublicHallState;
      setTaken(new Set(data.taken || []));
      if (data.gates) setGates(data.gates);
      if (data.error) setHallStatus(data.error);
      else setHallStatus("Taken seats are marked red. Closed sections cannot be booked.");
    } catch {
      setHallStatus("Could not refresh taken seats.");
    }
  }, []);

  useEffect(() => {
    if (initial.error) {
      setHallStatus(initial.error);
    } else {
      setHallStatus("Taken seats are marked red. Closed sections cannot be booked.");
    }
    void refreshHall();
  }, [initial.error, refreshHall]);

  const openSeats = useMemo(() => {
    let open = 0;
    for (const letter of "ABCDEFGHIJKLMNO") {
      const cat = categoryForSeat(`${letter}1`);
      if (!cat || !gates[cat]) continue;
      for (let n = 1; n <= 20; n += 1) {
        const code = `${letter}${n}`;
        if (!taken.has(code)) open += 1;
      }
    }
    return open;
  }, [gates, taken]);

  function selectSeat(code: string) {
    setSelected((prev) => (prev === code ? null : code));
  }

  function goToForm() {
    if (!selected) return;
    setFormError("");
    setFormStatus("");
    setStep(2);
  }

  async function createTicket() {
    setFormError("");
    let parsed;
    try {
      parsed = parseBooking({
        seat: selected || "",
        fullName: form.fullName,
        countryCode: form.countryCode,
        whatsapp: form.whatsapp,
        email: form.email,
      });
    } catch (err) {
      setFormError(err instanceof ValidationError ? err.message : "Check the form and try again.");
      return;
    }

    setSubmitting(true);
    setFormStatus("Building the ticket PDF and saving the seat.");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seat: parsed.seat,
          fullName: parsed.fullName,
          countryCode: parsed.countryCode,
          whatsapp: parsed.whatsappNumber,
          email: parsed.email,
        }),
      });
      const data = (await res.json()) as { booking?: BookingResult; error?: string };
      if (!res.ok || !data.booking) {
        const message = data.error || "Could not save this booking.";
        if (res.status === 409 || /taken|already/i.test(message)) {
          setFormError(`${message} Pick another seat.`);
          await refreshHall();
          setSelected(null);
          setStep(1);
          return;
        }
        setFormError(message);
        return;
      }

      const nextTicket: TicketState = {
        name: data.booking.fullName,
        seat: data.booking.seat,
        category: categoryDisplay(data.booking.category),
        id: data.booking.ticketId,
        email: data.booking.email,
        whatsapp: data.booking.whatsappE164,
      };
      setTicket(nextTicket);
      setTaken((prev) => new Set(prev).add(data.booking!.seat));
      try {
        const doc = await buildTicketPdf({
          name: nextTicket.name,
          seat: nextTicket.seat,
          category: nextTicket.category,
          id: nextTicket.id,
        });
        setPdfDoc(doc);
        setTicketStatus("Ticket is ready and saved.");
      } catch (err) {
        setPdfDoc(null);
        setTicketStatus(`Ticket is saved. The PDF could not be built (${String((err as Error).message || err)}). Try Download ticket again.`);
      }
      setStep(3);
      void refreshHall();
    } finally {
      setSubmitting(false);
      setFormStatus("");
    }
  }

  async function ensurePdf() {
    if (pdfDoc) return pdfDoc;
    if (!ticket) return null;
    const doc = await buildTicketPdf({
      name: ticket.name,
      seat: ticket.seat,
      category: ticket.category,
      id: ticket.id,
    });
    setPdfDoc(doc);
    return doc;
  }

  async function download() {
    try {
      const doc = await ensurePdf();
      if (!doc || !ticket) {
        setTicketStatus("The PDF is not ready yet. Go back and create the ticket again.");
        return;
      }
      await downloadTicketPdf(doc, ticket.seat, ticket.id);
    } catch (err) {
      setTicketStatus(`Download failed. ${String((err as Error).message || err)}`);
    }
  }

  async function share() {
    try {
      const doc = await ensurePdf();
      if (!doc || !ticket) {
        setTicketStatus("The PDF is not ready yet. Go back and create the ticket again.");
        return;
      }
      await shareTicketPdf(doc, {
        name: ticket.name,
        seat: ticket.seat,
        id: ticket.id,
        email: ticket.email,
        whatsapp: ticket.whatsapp,
      });
    } catch (err) {
      setTicketStatus(`Share failed. ${String((err as Error).message || err)}`);
    }
  }

  const selectedMeta = selected
    ? `${rowName(selected)} · ${CATEGORY_LABEL[categoryForSeat(selected) || "gold"]}`
    : "Click a seat on the chart.";

  return (
    <>
      <ol className="steps" aria-label="Booking steps">
        <li className="step" aria-current={step === 1 ? "step" : undefined}>
          <span className="step-num">1</span> Select Seat
        </li>
        <li className="step" aria-current={step === 2 ? "step" : undefined}>
          <span className="step-num">2</span> Full Name
        </li>
        <li className="step" aria-current={step === 3 ? "step" : undefined}>
          <span className="step-num">3</span> Ticket
        </li>
      </ol>

      {step === 1 ? (
        <section className="panel" aria-labelledby="seat-heading">
          <div className="layout">
            <HallShell
              headingId="seat-heading"
              statusId="hall-status"
              status={hallStatus}
              totalSeats={TOTAL_SEATS}
              openSeats={openSeats}
            >
              <HallChart taken={taken} gates={gates} selected={selected} onSelect={selectSeat} labelledBy="seat-heading" />
            </HallShell>
            <aside className="side">
              <SeatLegend />
              <div className="card selected-box">
                <h2>Selected seat</h2>
                <p className="seat-code">{selected || "None"}</p>
                <p>{selectedMeta}</p>
              </div>
              <div className="actions">
                <button className="btn btn-gold" type="button" disabled={!selected} onClick={goToForm}>
                  Continue to full name
                </button>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <BookingForm
          fullName={form.fullName}
          countryCode={form.countryCode}
          whatsapp={form.whatsapp}
          email={form.email}
          error={formError}
          status={formStatus}
          submitting={submitting}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onSubmit={() => void createTicket()}
          onBack={() => setStep(1)}
        />
      ) : null}

      {step === 3 && ticket ? (
        <TicketPreview
          name={ticket.name}
          seat={ticket.seat}
          category={ticket.category}
          ticketId={ticket.id}
          email={ticket.email}
          whatsapp={ticket.whatsapp}
          status={ticketStatus}
          onDownload={() => void download()}
          onShare={() => void share()}
          onNew={() => {
            setTicket(null);
            setPdfDoc(null);
            setForm(emptyForm);
            setSelected(null);
            setTicketStatus("");
            setStep(1);
          }}
        />
      ) : null}
    </>
  );
}
