"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminMark } from "@/components/AdminMark";
import { HallChart, HallShell, SeatLegend } from "@/components/HallChart";
import { Masthead } from "@/components/Masthead";
import { CATEGORY_LABEL, CATEGORY_RANGE, TOTAL_SEATS, categoryForSeat, parseSeat } from "@/lib/hall";
import type { Category } from "@/lib/hall";
import { buildTicketPdf, shareTicketPdf } from "@/lib/ticket-pdf";
import { categoryDisplay } from "@/lib/ticket-copy";
import type { Gates, PublicHallState, RegistrationRecord } from "@/lib/types";
import { DEFAULT_GATES } from "@/lib/types";

function formatWhen(iso: string) {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function csv(value: string) {
  const text = String(value || "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function AdminApp({ initial }: { initial: PublicHallState }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [items, setItems] = useState<RegistrationRecord[]>([]);
  const [gates, setGates] = useState<Gates>(initial.gates || DEFAULT_GATES);
  const [status, setStatus] = useState(initial.error || "");
  const [filter, setFilter] = useState("");
  const [inspect, setInspect] = useState<string | null>(null);

  const taken = useMemo(() => new Set(items.map((row) => row.seat)), [items]);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      setAuthed(res.ok);
    } catch {
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const load = useCallback(async () => {
    setStatus("Loading registrations.");
    try {
      const [bookingsRes, hallRes] = await Promise.all([
        fetch("/api/admin/bookings", { cache: "no-store" }),
        fetch("/api/hall", { cache: "no-store" }),
      ]);
      if (bookingsRes.status === 401) {
        setAuthed(false);
        return;
      }
      const bookings = (await bookingsRes.json()) as { items?: RegistrationRecord[]; error?: string };
      const hall = (await hallRes.json()) as PublicHallState;
      setItems(bookings.items || []);
      if (hall.gates) setGates(hall.gates);
      if (bookings.error) setStatus(bookings.error);
      else if (hall.error) setStatus(hall.error);
      else setStatus("Showing the registration list.");
    } catch (err) {
      setStatus(`Could not load registrations. ${String((err as Error).message || err)} Try Refresh.`);
    }
  }, []);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setGateError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setGateError(data.error || "Incorrect password.");
      return;
    }
    setPassword("");
    setAuthed(true);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setItems([]);
    setInspect(null);
  }

  async function toggleGate(id: Category, open: boolean) {
    setStatus(`Updating ${CATEGORY_LABEL[id]} section.`);
    const res = await fetch("/api/admin/gates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [id]: open }),
    });
    const data = (await res.json()) as { gates?: Gates; error?: string };
    if (!res.ok) {
      setStatus(data.error || "Could not update section gates.");
      return;
    }
    if (data.gates) setGates(data.gates);
    setStatus(`${CATEGORY_LABEL[id]} is ${open ? "open" : "closed"} for booking.`);
  }

  async function shareRow(row: RegistrationRecord) {
    const doc = await buildTicketPdf({
      name: row.fullName,
      seat: row.seat,
      category: categoryDisplay(row.category),
      id: row.ticketId,
    });
    await shareTicketPdf(doc, {
      name: row.fullName,
      seat: row.seat,
      id: row.ticketId,
      email: row.email,
      whatsapp: row.whatsappE164,
    });
  }

  async function deleteRow(row: RegistrationRecord) {
    const ok = window.confirm(`Delete the booking for seat ${row.seat} (${row.fullName})? The seat will become available again.`);
    if (!ok) return;
    const res = await fetch("/api/admin/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: row.ticketId, seat: row.seat }),
    });
    const data = (await res.json()) as { items?: RegistrationRecord[]; error?: string };
    if (!res.ok) {
      setStatus(data.error || "Could not delete that booking.");
      return;
    }
    setItems(data.items || []);
    setStatus(`Deleted the booking for ${row.seat}.`);
  }

  function exportCsv() {
    if (!items.length) {
      setStatus("There are no registrations to download.");
      return;
    }
    const header = ["Full Name", "WhatsApp", "Email", "Seat", "Category", "Time", "Ticket ID"];
    const lines = [header.join(",")].concat(
      items.map((row) =>
        [
          csv(row.fullName),
          csv(row.whatsappE164),
          csv(row.email),
          csv(row.seat),
          csv(categoryDisplay(row.category)),
          csv(row.createdAt),
          csv(row.ticketId),
        ].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "icos-2027-registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const occupant = inspect ? items.find((row) => row.seat === inspect) : null;
  const rows = items.filter((row) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [row.fullName, row.seat, row.ticketId, row.category, row.email, row.whatsappE164].join(" ").toLowerCase().includes(q);
  });

  const openSeats = useMemo(() => {
    let open = 0;
    for (const letter of "ABCDEFGHIJKLMNO") {
      const cat = categoryForSeat(`${letter}1`);
      if (!cat || !gates[cat]) continue;
      for (let n = 1; n <= 20; n += 1) {
        if (!taken.has(`${letter}${n}`)) open += 1;
      }
    }
    return open;
  }, [gates, taken]);

  return (
    <>
      <Masthead
        eyebrow="Orthosociety · ICOS 2027"
        title="Admin"
        titleLine2="seating and registrations"
        mark={<AdminMark loggedIn={authed} onLogout={() => void logout()} />}
      />
      <div className="app admin-app">
        <main id="main">
          {checking ? (
            <p className="status">Checking admin session.</p>
          ) : !authed ? (
            <section className="admin-gate-wrap" aria-labelledby="gate-heading">
              <div className="panel admin-gate">
                <p className="ticket-stub-kicker">CC 2027</p>
                <h2 id="gate-heading" className="panel-title">
                  Admin login
                </h2>
                <p className="hint">Enter the password to open the hall chart and the registration list.</p>
                <form onSubmit={(event) => void login(event)}>
                  <label htmlFor="admin-pass">Password</label>
                  <input
                    id="admin-pass"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <p className="error" role="alert">
                    {gateError}
                  </p>
                  <div className="actions form-actions">
                    <button className="btn btn-gold" type="submit">
                      Log in
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <section aria-labelledby="dash-heading">
              <h2 id="dash-heading" className="visually-hidden">
                Registrations and hall
              </h2>
              <p className="status" role="status">
                {status}
              </p>
              <div className="layout">
                <HallShell
                  headingId="admin-hall-heading"
                  statusId="admin-hall-status"
                  status=""
                  totalSeats={TOTAL_SEATS}
                  openSeats={openSeats}
                >
                  <HallChart
                    taken={taken}
                    gates={gates}
                    inspect={inspect}
                    selectable={false}
                    admin
                    onSelect={setInspect}
                    labelledBy="admin-hall-heading"
                  />
                </HallShell>
                <aside className="side">
                  <SeatLegend extraClosed />
                  <div className="card">
                    <h2>Section booking</h2>
                    <div className="section-toggles">
                      {(["gold", "blue", "gray"] as const).map((id) => (
                        <label className="toggle-row" key={id}>
                          <input
                            type="checkbox"
                            checked={gates[id]}
                            onChange={(event) => void toggleGate(id, event.target.checked)}
                          />
                          <span>
                            <strong>
                              {CATEGORY_LABEL[id]} ({CATEGORY_RANGE[id]})
                            </strong>
                            <span>{gates[id] ? "Open for public booking" : "Closed until you enable this section"}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="card selected-box">
                    <h2>Seat details</h2>
                    <p className="seat-code">{inspect || "None"}</p>
                    {occupant ? (
                      <>
                        <p>
                          <strong>{occupant.fullName}</strong>
                          <br />
                          {parseSeat(occupant.seat)?.row
                            ? `Row ${parseSeat(occupant.seat)?.row} · ${categoryDisplay(occupant.category)}`
                            : categoryDisplay(occupant.category)}
                          <br />
                          {occupant.whatsappE164}
                          <br />
                          {occupant.email}
                          <br />
                          Ticket {occupant.ticketId}
                          <br />
                          {formatWhen(occupant.createdAt)}
                        </p>
                        <div className="admin-seat-actions">
                          <button className="btn btn-gold btn-compact" type="button" onClick={() => void shareRow(occupant)}>
                            Share PDF
                          </button>
                          <button className="btn btn-danger btn-compact" type="button" onClick={() => void deleteRow(occupant)}>
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>{inspect ? "Not yet booked." : "Click a seat on the chart."}</p>
                    )}
                  </div>
                </aside>
              </div>

              <div className="panel admin-list-panel">
                <div className="admin-toolbar">
                  <div>
                    <h2 className="panel-title">Registrations</h2>
                    <p className="admin-count">
                      {items.length} registration{items.length === 1 ? "" : "s"}
                      {filter.trim() ? ` · ${rows.length} shown` : ""}
                    </p>
                  </div>
                  <div className="admin-actions">
                    <input
                      type="search"
                      placeholder="Search name, seat, WhatsApp, or email"
                      aria-label="Search name, seat, WhatsApp, or email"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    />
                    <button className="btn btn-ghost" type="button" onClick={() => void load()}>
                      Refresh
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={exportCsv}>
                      Download CSV
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>WhatsApp</th>
                        <th>Email</th>
                        <th>Seat</th>
                        <th>Category</th>
                        <th>Time</th>
                        <th>Ticket ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!rows.length ? (
                        <tr className="empty-row">
                          <td colSpan={8}>
                            {items.length
                              ? "No registrations match this search. Clear the search to see the full list."
                              : "No registrations yet. Seats booked on the public chart will appear here after Refresh."}
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.ticketId}>
                            <td data-label="Full Name">{row.fullName}</td>
                            <td data-label="WhatsApp">{row.whatsappE164}</td>
                            <td data-label="Email">{row.email}</td>
                            <td data-label="Seat">
                              <strong>{row.seat}</strong>
                            </td>
                            <td data-label="Category">{categoryDisplay(row.category)}</td>
                            <td data-label="Time">{formatWhen(row.createdAt)}</td>
                            <td className="mono" data-label="Ticket ID">
                              {row.ticketId}
                            </td>
                            <td data-label="Actions">
                              <div className="admin-row-actions">
                                <button className="btn btn-gold btn-compact" type="button" onClick={() => void shareRow(row)}>
                                  Share PDF
                                </button>
                                <button className="btn btn-danger btn-compact" type="button" onClick={() => void deleteRow(row)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
