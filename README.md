# Conference with CC

Polished single-page seating chart and ticket generator for **Conference with CC**.

**Live site:** [https://cscahyosugiharto.github.io/conference-with-cc/](https://cscahyosugiharto.github.io/conference-with-cc/)

Enable Pages once (repo admin): [Settings → Pages](https://github.com/cscahyosugiharto/conference-with-cc/settings/pages) → **Source: GitHub Actions**, or **Deploy from a branch** `main` / `(root)`. The site files are already on `main`.

## What it does

1. Interactive hall map with **exactly 200 seats** in blocks **A–L** (gold premium / navy standard).
2. Click a seat (emerald selected state) → **Lanjut**.
3. Enter **Nama Dokter** → generate a navy/gold/cream **PDF ticket** with QR-style code.
4. **Unduh Tiket**, **Bagikan ke WhatsApp** (`wa.me`), and Web Share when the browser supports it.

Static site only — no backend and no payment.

## Local preview

Open `index.html` or:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

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
