# International Conference of Orthodontic Society 2027

Seating chart and ticket generator for **ICOS 2027** / **CC 2027**.

**Live site:** [https://cscahyosugiharto.github.io/conference-with-cc/](https://cscahyosugiharto.github.io/conference-with-cc/)

**Admin:** [admin.html](https://cscahyosugiharto.github.io/conference-with-cc/admin.html) (password `cc2026`)

Visual direction lives in [DESIGN.md](DESIGN.md).

## What it does

1. Interactive Plenary Hall map with **exactly 300 seats**: rows **A–O**, seats **1–20**, in three aisle blocks (left 1–6, middle 7–14, right 15–20).
2. Color sections match the official layout:
   - **Gold / Front:** rows A–G (140 seats)
   - **Blue / Middle:** rows H–J (60 seats)
   - **Gray / Back:** rows K–O (100 seats)
3. Occupied seats turn **red**. Closed sections look blocked and cannot be booked, even if empty.
4. By default only **Gold** is open. Admin can independently open or close Gold, Blue, and Gray. Those gates sync through the shared store.
5. Click an open seat, continue to **Full Name** (empty field, no placeholder), then a luxury PDF ticket for **CC 2027**.
6. Admin uses the same seating chart, section toggles, plus a registration list with **Share PDF** and **Delete** on each row.

Static site, no payment. Registrations use a shared store with localStorage fallback.

## Local preview

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` and `http://localhost:8080/admin.html`.

Layout checks:

```bash
node scripts/verify-layout.js
```
