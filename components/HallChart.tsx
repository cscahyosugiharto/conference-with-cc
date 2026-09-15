"use client";

import type { ReactNode } from "react";
import { AISLE_GROUPS, ROWS, columnNumbers, seatsInGroup, type RowLetter } from "@/lib/hall";
import type { Gates } from "@/lib/types";

type HallChartProps = {
  taken: Set<string>;
  gates: Gates;
  selected?: string | null;
  inspect?: string | null;
  selectable?: boolean;
  admin?: boolean;
  onSelect: (code: string) => void;
  labelledBy?: string;
};

function seatTitle(code: string, taken: boolean, closed: boolean, admin: boolean) {
  if (taken) return admin ? `${code} · booked` : `${code} · taken`;
  if (closed && !admin) return `${code} · this section is closed`;
  return code;
}

export function HallChart({
  taken,
  gates,
  selected,
  inspect,
  selectable = true,
  admin = false,
  onSelect,
  labelledBy,
}: HallChartProps) {
  const active = admin ? inspect : selected;

  return (
    <div className="hall-chart" role="group" aria-labelledby={labelledBy}>
      <div className="col-heads" aria-hidden="true">
        <span className="row-spacer" />
        {AISLE_GROUPS.map((group, i) => (
          <div key={`${group.start}-${group.end}`} style={{ display: "contents" }}>
            {i > 0 ? <span className="aisle" /> : null}
            <div className="col-cluster">
              {columnNumbers(group.start, group.end).map((n) => (
                <span className="col-num" key={n}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        ))}
        <span className="row-spacer" />
      </div>

      {ROWS.map((row) => (
        <div className="hall-row" key={row}>
          <span className="row-label">{row}</span>
          {AISLE_GROUPS.map((group, i) => (
            <div key={`${row}-${group.start}`} style={{ display: "contents" }}>
              {i > 0 ? <span className="aisle" aria-hidden="true" /> : null}
              <div className="seat-cluster">
                {seatsInGroup(row as RowLetter, group.start, group.end).map((seat) => {
                  const isTaken = taken.has(seat.code);
                  const closed = !gates[seat.category];
                  const blocked = !admin && (isTaken || closed);
                  return (
                    <button
                      key={seat.code}
                      type="button"
                      className={`seat ${seat.category}${isTaken ? " taken" : ""}${closed ? " closed" : ""}`}
                      data-code={seat.code}
                      aria-label={`Seat ${seat.code}, ${seat.category}${isTaken ? ", taken" : closed ? ", closed" : ""}`}
                      aria-pressed={active === seat.code}
                      title={seatTitle(seat.code, isTaken, closed, admin)}
                      disabled={selectable ? blocked : false}
                      onClick={() => onSelect(seat.code)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <span className="row-label">{row}</span>
        </div>
      ))}
    </div>
  );
}

export function HallShell({
  headingId,
  statusId,
  status,
  children,
  totalSeats,
  openSeats,
}: {
  headingId: string;
  statusId: string;
  status: string;
  children: ReactNode;
  totalSeats: number;
  openSeats: number;
}) {
  return (
    <div>
      <h2 id={headingId} className="visually-hidden">
        Select a seat
      </h2>
      <p className="status" id={statusId} role="status">
        {status}
      </p>
      <div className="hall-wrap">
        <div className="stage" aria-hidden="true">
          <div className="stage-copy">
            <div className="stage-kicker">ICOS · CC 2027</div>
            <p className="stage-title">INTERNATIONAL CONFERENCE OF ORTHODONTIC SOCIETY 2027</p>
          </div>
        </div>
        <div className="led-screen" aria-hidden="true">
          <div className="led-bezel">
            <div className="led-panel">
              <span className="led-label">MAIN SCREEN</span>
            </div>
          </div>
        </div>
        <div className="podium" aria-hidden="true" />
        {children}
        <div className="hall-footer">
          <div className="total-seats">
            <span>{totalSeats}</span>
            <small>TOTAL SEATS</small>
          </div>
          <div className="entrance">
            <div className="door">
              <div className="arrow" />
              <span>Main Entrance</span>
            </div>
          </div>
          <div className="total-seats total-seats-end">
            <span>{openSeats}</span>
            <small>OPEN SEATS</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeatLegend({ extraClosed = true }: { extraClosed?: boolean }) {
  return (
    <div className="card">
      <h2>Seat categories</h2>
      <div className="legend-simple">
        <div className="legend-item">
          <span className="swatch gold" />
          <span>Gold (A–G)</span>
        </div>
        <div className="legend-item">
          <span className="swatch navy" />
          <span>Blue (H–J)</span>
        </div>
        <div className="legend-item">
          <span className="swatch gray" />
          <span>Gray (K–O)</span>
        </div>
        <div className="legend-item">
          <span className="swatch pick" />
          <span>Selected Seat</span>
        </div>
        <div className="legend-item">
          <span className="swatch taken" />
          <span>Seat Taken</span>
        </div>
        {extraClosed ? (
          <div className="legend-item">
            <span className="swatch closed" />
            <span>Section closed</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
