# International Conference of Orthodontic Society 2027

Seat booking and ticket generator for **ICOS 2027** / **CC 2027**.

Visual direction lives in [DESIGN.md](DESIGN.md).

This is a **Next.js (App Router)** app. Bookings persist in **Supabase (Postgres)**. It is no longer a GitHub Pages static site.

## What it does

1. Hall map with **300 seats** in rows **A–O × 1–20**, with aisles **1–6 / 7–14 / 15–20**.
   - Gold A–G (140)
   - Blue H–J (60)
   - Gray K–O (100)
2. Default: **Gold is open**. Blue and Gray stay closed until an admin enables them.
3. Click an open seat, continue to **Full Name**, **WhatsApp** (country code, default Indonesia +62), and **Email**, then a luxury PDF from `public/assets/ticket-blank-v2.jpg`.
4. Occupied seats turn **red**. Closed sections cannot be booked on the public chart.
5. Admin (`/admin`, password from `ADMIN_PASSWORD`, default `cc2026`): same chart, three section toggles, registration list, **Share PDF**, **Delete**.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then visit `http://localhost:3000` and `http://localhost:3000/admin`.

Without Supabase env vars the hall still renders. Creating a ticket and admin list/delete/toggles will explain that the database is not configured.

```bash
npm test
npm run typecheck
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor: run [`supabase/migrations/20260915000000_init.sql`](supabase/migrations/20260915000000_init.sql).
3. Project Settings → API: copy the URL, anon key, and **service role** key into `.env.local`.

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=cc2026
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not put it in client code or commit it.

The migration enables RLS:

- `registrations` is not readable by `anon` (no names, WhatsApp, or email on the public key).
- `occupied_seats` view exposes only `seat` and `category`.
- `section_gates` is readable so the public chart can see which sections are open.
- Inserts, updates, and deletes go through Next.js Route Handlers using the service role. Seat uniqueness is a unique constraint on `registrations.seat`.

## Deploy

### Vercel

1. Import this repository.
2. Set the four env vars above (Production and Preview).
3. Deploy. Framework preset: Next.js.

### Node host (including a Node.js VPS)

```bash
npm ci
npm run build
npm start
```

Set the same env vars on the host. The app listens on `PORT` (Next.js default 3000).

PDF tickets are built **in the browser** with jsPDF and the ticket blank image, so generation does not depend on a headless server.

## Test steps

1. `npm test` — 300-seat map, Gold/Blue/Gray counts, WhatsApp E.164, email validation.
2. `npm run dev` with no `.env.local` — hall renders; Create ticket reports missing database config.
3. Apply the SQL migration. Restart with `.env.local` filled in.
4. Public: Gold seats clickable; Blue and Gray look closed and cannot be booked.
5. Book a Gold seat with name, WhatsApp +62, and a valid email. Confirm the ticket preview, download PDF, and a red occupied seat.
6. Try the same seat again — it must fail as taken.
7. `/admin` with `cc2026` (or `ADMIN_PASSWORD`). Enable Blue, book a Blue seat on the public chart.
8. Admin list shows name, WhatsApp, email. Share PDF and Delete. After delete, the seat is open again.
9. Download CSV from admin. Search by name or email.

Previous kvdb / localStorage bookings are not imported. Re-enter any seats you still need.
