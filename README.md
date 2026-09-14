# International Conference of Orthodontic Society 2027

Seating chart and ticket generator for **ICOS 2027** / **CC 2027**.

**Live site:** [https://cscahyosugiharto.github.io/conference-with-cc/](https://cscahyosugiharto.github.io/conference-with-cc/)

**Admin:** [admin.html](https://cscahyosugiharto.github.io/conference-with-cc/admin.html) — password `cc2026`

## What it does

1. Interactive hall map with **exactly 200 seats** in blocks **A–L** (gold / blue). Occupied seats turn **red**.
2. Click a seat → **Lanjut** → **Nama Dokter** (empty field, no placeholder) → PDF ticket for **CC 2027**.
3. Admin list of registrations with per-row **Bagikan PDF**.

Static site — no payment. Registrations use a shared KVdb bucket with localStorage fallback.

## Local preview

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` and `http://localhost:8080/admin.html`.
