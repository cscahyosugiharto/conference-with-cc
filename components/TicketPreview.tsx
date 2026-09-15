"use client";

import { TICKET_BLANK_SRC } from "@/lib/ticket-copy";

type TicketPreviewProps = {
  name: string;
  seat: string;
  category: string;
  ticketId: string;
  email?: string;
  whatsapp?: string;
  status: string;
  onDownload: () => void;
  onShare: () => void;
  onNew: () => void;
};

export function TicketPreview({
  name,
  seat,
  category,
  ticketId,
  email,
  whatsapp,
  status,
  onDownload,
  onShare,
  onNew,
}: TicketPreviewProps) {
  return (
    <section className="panel ticket-panel" aria-labelledby="ticket-heading">
      <h2 id="ticket-heading" className="panel-title">
        Your ticket
      </h2>
      <p className="hint">The name, seat, category, and ticket ID sit on the official blank. Download or share the PDF.</p>
      <p className="status" role="status">
        {status}
      </p>
      <div className="ticket-blank-wrap">
        {/* Overlay positions are percent-based on the blank's intrinsic size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ticket-blank-img"
          src={TICKET_BLANK_SRC}
          alt="International Conference of Orthodontic Society 2027 ticket"
        />
        <p className="ticket-field tf-name">{name}</p>
        <p className="ticket-field tf-seat">{seat}</p>
        <p className="ticket-field tf-cat">{category}</p>
        <p className="ticket-field tf-event">International Conference of Orthodontic Society 2027</p>
        <p className="ticket-field tf-id">{ticketId}</p>
      </div>
      {email || whatsapp ? (
        <p className="ticket-contact">
          {whatsapp ? <>WhatsApp {whatsapp}</> : null}
          {whatsapp && email ? " · " : null}
          {email ? <>{email}</> : null}
        </p>
      ) : null}
      <div className="actions ticket-actions">
        <button className="btn btn-gold" type="button" onClick={onDownload}>
          Download ticket
        </button>
        <button className="btn btn-gold" type="button" onClick={onShare}>
          Share ticket PDF
        </button>
        <button className="btn btn-ghost" type="button" onClick={onNew}>
          Choose another seat
        </button>
      </div>
    </section>
  );
}
