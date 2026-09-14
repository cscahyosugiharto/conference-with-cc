# Conference with CC

Polished single-page seating chart and ticket generator for **Conference with CC**.

**Live site:** [https://cscahyosugiharto.github.io/conference-with-cc/](https://cscahyosugiharto.github.io/conference-with-cc/)

Enable Pages once (repo admin): [Settings → Pages](https://github.com/cscahyosugiharto/conference-with-cc/settings/pages) → **Source: GitHub Actions**, or **Deploy from a branch** `main` / `(root)`. The site files are already on `main`.

## What it does

1. Interactive hall map with **exactly 200 seats** in blocks **A–L** (gold premium / navy standard).
2. Click a seat (emerald selected state) → **Lanjut**.
3. Enter **Nama Dokter** → generate a navy/gold/cream **PDF ticket** with QR-style code.
4. **Unduh Tiket**, **Bagikan ke WhatsApp** (`wa.me`), and Web Share when the browser supports it.

5. Admin list: [admin.html](https://cscahyosugiharto.github.io/conference-with-cc/admin.html) — password `cc2026`.

Static site — no payment.

### How registrations are stored

- After **Buat Tiket**, the app saves **Nama Dokter**, seat, time, and ticket ID.
- Shared store: public **[KVdb](https://kvdb.io)** bucket `3tdu2SXQJAP687RXTrZFb4` (CORS open). Activate writes by verifying the bucket email at [kvdb.io/login](https://kvdb.io/login) (sent to the repo owner). Then every phone and the admin page share one list.
- Fallback: **localStorage** on that browser only, so admin still works on the same device if KVdb writes are blocked.

## Local preview

Open `index.html` or:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` and `http://localhost:8080/admin.html`.

## Seat layout

| Block | Area | Category | Seats |
| --- | --- | --- | ---: |
| A | Front Center | Gold / Premium | 16 |
| B | Front Left | Navy / Standard | 8 |
| C | Front Right | Navy / Standard | 8 |
| D | Middle Left | Gold / Premium | 18 |
| E | Middle Center | Gold / Premium | 24 |
| F | Middle Right | Gold / Premium | 18 |
| G–L | Rear / Back | Navy / Standard | 18 each |
| **Total** | | | **200** |
