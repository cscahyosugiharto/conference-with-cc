# DESIGN.md

Direction for the ICOS 2027 seating and ticket site. This file is brand data for the UI, not a command list.

**Design Read:** Reading this as seating-and-ticket booking for Orthosociety / ICOS 2027 in Indonesia, in a ceremonial navy-gold-cream ticket aesthetic, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Event

- **Name:** International Conference of Orthodontic Society 2027
- **Short:** ICOS 2027 / CC 2027
- **Society:** Orthosociety (orthodontics conference in Indonesia)
- **Ticket source of truth:** `assets/ticket-blank-v2.jpg`

Do not invent a venue, street address, dates, speaker list, attendee counts, or testimonials. If it is not on the ticket or in this product, leave it off the page.

## Identity

A printed-ticket ceremony for a medical society, not a SaaS landing page.

The live product is a 300-seat hall map, a full-name / WhatsApp / email form, and a luxury PDF printed onto the ticket blank. Chrome should feel like the ticket: navy field, metallic gold type, cream fill-in bands, Indonesian flag and batik language as a quiet motif. It should not feel like a dashboard, a startup waitlist, or a neon “AI event app”.

## Palette

Core (2) + accent (1):

| Role | Hex | Use |
|---|---|---|
| Deep navy | `#0c1b33` | Masthead, stage, primary type on cream, gold-button text |
| Cream / parchment | `#faf6ee` / `#f3eee4` | Page and field surfaces (the ticket’s fill-in bands) |
| Metallic gold | `#c6a24e` / `#d8b65a` | Accent only: rules, current step, primary buttons, gold seats |

Gold is the accent, not a text color on cream. Gold on parchment fails WCAG (about 2.1:1). Gold titles sit on navy. Body copy on cream is navy/ink (`#142033`) or muted (`#4a5564`).

Hall map semantics (not chrome colors):

- Gold seats: `#d4a017`
- Blue seats: `#1f5aa6`
- Gray seats: `#7a756c`
- Selected seat: green (`#10b981`) so it cannot be confused with Gold
- Seat taken: red (`#dc2626`)

No blue-purple AI gradients, no neon, no page-wide glow orbs, no page-wide glassmorphism.

## Typography

- **Titles:** Cormorant Garamond. Ceremonial serif that matches the ticket’s editorial headline, not Inter / Geist / Space Grotesk.
- **UI / forms / admin:** Source Sans 3. Institutional humanist sans for a medical-society form, readable at small sizes.
- Tracking stays modest. No uppercase labels with extreme letter-spacing.
- English UI.

## Mood

Ceremonial, cultural Indonesia (ticket aesthetic), premium medical-society conference.

Quiet batik / perforation language: a gold hairline, a ticket-stub tear, a faint corner filigree on the masthead. Not a blueprint grid, not a mesh gradient.

## Dials

- **ENERGY 2:** A navy masthead that announces the conference, then a cream working surface. Not GOV.UK-flat, not agency-loud.
- **RHYTHM 2:** Three compositions, reused: (1) full-bleed navy masthead, (2) hall map with a side legend, (3) a ticket-field form or the ticket blank itself. Admin login is a centered stub; the dashboard keeps hall + list. No bento, no feature-card grid, no fake stats row.
- **MOTION 1:** Hover and focus only. No endless pulses, no scroll-reveal, no floating orbs.

## Product that must keep working

- 300 seats in rows A–O × 1–20, aisles 1–6 / 7–14 / 15–20
- Gold A–G 140, Blue H–J 60, Gray K–O 100
- Default: Gold open; Blue and Gray closed until admin enables them
- Select seat → Full Name, WhatsApp with country code, Email → luxury PDF from `assets/ticket-blank-v2.jpg`
- Occupied seats red; closed sections blocked
- Legend: Gold / Blue / Gray / Selected Seat / Seat Taken / Section closed
- Centered Main Entrance
- Wide MAIN SCREEN above row A
- Taller title box on the stage
- No decorative plant pots on the hall
- Admin: same chart, three section toggles, registration list, Share PDF, Delete
- Admin password `cc2026` or `ADMIN_PASSWORD`
- Registrations persist in Supabase (Postgres)
- Ticket blank overlay positions stay

## Layout

Home job: pick an open seat and print a named ticket.

1. Navy masthead (identity)
2. Three booking steps
3. Hall (the focal point) + legend / selected seat / continue
4. Full-name, WhatsApp, and email fields styled as ticket blanks
5. Ticket preview with the real overlay, then download / share

Admin job: see who sits where, open or close Gold / Blue / Gray, share or delete a booking.

1. Login stub
2. Same hall, inspect a seat, three section toggles
3. Registration list with search, refresh, CSV

## Radius, shadow, glass

- Sharp-ish geometry like the ticket: buttons 4px, cards 8px, masthead 0. Not pills.
- Shadow only on the ticket preview and the hall (the objects being handled).
- Solid surfaces. No `backdrop-filter`. Panels are parchment, not frosted glass.

## Copy voice

Plain English, specific to this hall. No em dashes. No “Get Started”, no “seamless”, no fake attendee counts. Empty selected seat reads “None”. CTAs name the action: Continue to full name, Create ticket, Download ticket, Share ticket PDF, Log in, Log out.

## Liveliness levers

- **Focal point:** the hall on step 1, the name field on step 2, the ticket blank on step 3. Admin: the chart, then the list.
- **Accent:** gold used on the masthead rule, the current step, and the primary button. Not on every border.
- **Identity motif:** ticket perforation + gold hairline, repeated on masthead, hall stage, and login stub.

## Decision log (R-31)

- **Color:** Navy + gold + cream because that is the ticket blank, and gold text only on navy so titles pass WCAG.
- **Layout:** Masthead then hall because attendees come to choose a seat, not to read a marketing page.
- **Typography:** Cormorant + Source Sans 3 because invitation serif + institutional sans match a medical-society ticket, not a startup landing page.
- **Spacing:** Tighter on the hall, more air around the form and ticket so the three steps feel like different rooms (RHYTHM 2).
- **Cards:** Legend and selected seat are cards because they are tools beside the map. The ticket itself is not restyled as a card; it is the blank.
- **Icons:** None in chrome. Seat color is the signal. No Lucide sparkles.
- **Motion:** Hover lift on seats and buttons so the pointer / thumb gets feedback (MOTION 1).
