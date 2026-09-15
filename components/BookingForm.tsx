"use client";

import { COUNTRY_DIALS, DEFAULT_COUNTRY_DIAL } from "@/lib/countries";

type BookingFormProps = {
  fullName: string;
  countryCode: string;
  whatsapp: string;
  email: string;
  error: string;
  status: string;
  submitting: boolean;
  onChange: (field: "fullName" | "countryCode" | "whatsapp" | "email", value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function BookingForm({
  fullName,
  countryCode,
  whatsapp,
  email,
  error,
  status,
  submitting,
  onChange,
  onSubmit,
  onBack,
}: BookingFormProps) {
  return (
    <section className="panel form-panel" aria-labelledby="form-heading">
      <h2 id="form-heading" className="panel-title">
        Full name
      </h2>
      <p className="hint">
        This name is printed on the ticket. Use the attendee’s name as it should appear. WhatsApp and email stay with
        the seat booking.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="field">
          <label htmlFor="full-name">Full Name</label>
          <input
            id="full-name"
            name="fullName"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            spellCheck={false}
            value={fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
          />
        </div>

        <div className="field">
          <span id="wa-label">WhatsApp number</span>
          <div className="phone-row" role="group" aria-labelledby="wa-label">
            <label className="visually-hidden" htmlFor="country-code">
              Country code
            </label>
            <select
              id="country-code"
              name="countryCode"
              value={countryCode || DEFAULT_COUNTRY_DIAL}
              onChange={(event) => onChange("countryCode", event.target.value)}
            >
              {COUNTRY_DIALS.map((country) => (
                <option key={`${country.iso}-${country.dial}`} value={country.dial}>
                  {country.iso} {country.dial} · {country.name}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor="whatsapp">
              WhatsApp number
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={whatsapp}
              onChange={(event) => onChange("whatsapp", event.target.value)}
            />
          </div>
          <p className="field-hint">Indonesia (+62) is selected by default. 0812… or 812… both work.</p>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </div>

        <p className="error" role="alert">
          {error}
        </p>
        <p className="status" role="status">
          {status}
        </p>
        <div className="actions form-actions">
          <button className="btn btn-gold" type="submit" disabled={submitting}>
            {submitting ? "Creating ticket..." : "Create ticket"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onBack} disabled={submitting}>
            Back to seats
          </button>
        </div>
      </form>
    </section>
  );
}
