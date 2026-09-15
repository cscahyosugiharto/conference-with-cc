(() => {
  const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];
  const SEATS_PER_ROW = 20;
  const TOTAL_SEATS = ROWS.length * SEATS_PER_ROW;
  const COLUMNS = [
    { id: "left", label: "6 SEATS", start: 1, end: 6 },
    { id: "middle", label: "8 SEATS", start: 7, end: 14 },
    { id: "right", label: "6 SEATS", start: 15, end: 20 },
  ];
  const AISLE_AFTER_ROWS = new Set(["G", "J"]);
  const SECTION_ORDER = ["gold", "blue", "gray"];
  const SECTIONS = {
    gold: {
      id: "gold",
      label: "Gold",
      zone: "Front",
      rows: ["A", "B", "C", "D", "E", "F", "G"],
      count: 140,
      cssClass: "gold",
    },
    blue: {
      id: "blue",
      label: "Blue",
      zone: "Middle",
      rows: ["H", "I", "J"],
      count: 60,
      cssClass: "blue",
    },
    gray: {
      id: "gray",
      label: "Gray",
      zone: "Back",
      rows: ["K", "L", "M", "N", "O"],
      count: 100,
      cssClass: "gray",
    },
  };
  const DEFAULT_SECTION_OPEN = { gold: true, blue: false, gray: false };
  const ROW_TO_SECTION = Object.fromEntries(
    Object.values(SECTIONS).flatMap((section) => section.rows.map((row) => [row, section.id])),
  );

  function sectionForRow(row) {
    return ROW_TO_SECTION[String(row || "").toUpperCase()] || "";
  }

  function parseSeat(code) {
    const m = String(code || "").trim().toUpperCase().match(/^([A-O])(20|1[0-9]|[1-9])$/);
    if (!m) return null;
    const row = m[1];
    const num = Number(m[2]);
    const section = sectionForRow(row);
    if (!section) return null;
    return { row, num, section, code: `${row}${num}` };
  }

  function sectionForSeat(code) {
    const parsed = parseSeat(code);
    return parsed ? parsed.section : "";
  }

  function categoryLabel(category) {
    if (category === "gold" || category === "premium") return "Gold";
    if (category === "blue" || category === "standard") return "Blue";
    if (category === "gray" || category === "back") return "Gray";
    return category || "";
  }

  function sectionMeta(sectionId) {
    return SECTIONS[sectionId] || null;
  }

  function seatInfo(code) {
    const parsed = parseSeat(code);
    if (!parsed) return null;
    const section = SECTIONS[parsed.section];
    return {
      ...parsed,
      name: `${section.zone} section · row ${parsed.row}`,
      category: parsed.section,
      sectionLabel: section.label,
    };
  }

  function makeSeatButton(row, num, selectable) {
    const info = seatInfo(`${row}${num}`);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `seat ${info.category}`;
    btn.dataset.code = info.code;
    btn.dataset.row = info.row;
    btn.dataset.num = String(info.num);
    btn.dataset.category = info.category;
    btn.dataset.section = info.category;
    btn.setAttribute("aria-label", `Seat ${info.code}, ${info.sectionLabel}`);
    btn.setAttribute("aria-pressed", "false");
    btn.title = info.code;
    if (!selectable) btn.tabIndex = 0;
    return btn;
  }

  function renderHall(container, { selectable = true } = {}) {
    container.innerHTML = "";
    container.classList.add("hall-chart");

    const heads = document.createElement("div");
    heads.className = "hall-col-heads";
    heads.setAttribute("aria-hidden", "true");
    heads.appendChild(document.createElement("span"));
    COLUMNS.forEach((col, index) => {
      if (index) {
        const aisle = document.createElement("span");
        aisle.className = "hall-aisle";
        heads.appendChild(aisle);
      }
      const head = document.createElement("div");
      head.className = "col-head";
      head.textContent = col.label;
      heads.appendChild(head);
    });
    container.appendChild(heads);

    const body = document.createElement("div");
    body.className = "hall-body";

    ROWS.forEach((row) => {
      const section = sectionForRow(row);
      const rowEl = document.createElement("div");
      rowEl.className = `hall-row section-${section}`;
      rowEl.dataset.row = row;
      rowEl.dataset.section = section;

      const label = document.createElement("div");
      label.className = "row-label";
      label.textContent = row;
      rowEl.appendChild(label);

      COLUMNS.forEach((col, index) => {
        if (index) {
          const aisle = document.createElement("div");
          aisle.className = "hall-aisle";
          aisle.setAttribute("aria-hidden", "true");
          if (row === "G" || row === "J" || row === "A") {
            const plant = document.createElement("span");
            plant.className = "aisle-plant";
            aisle.appendChild(plant);
          }
          rowEl.appendChild(aisle);
        }
        const grid = document.createElement("div");
        grid.className = `seats seats-${col.id}`;
        grid.style.gridTemplateColumns = `repeat(${col.end - col.start + 1}, auto)`;
        for (let n = col.start; n <= col.end; n += 1) {
          grid.appendChild(makeSeatButton(row, n, selectable));
        }
        rowEl.appendChild(grid);
      });

      body.appendChild(rowEl);

      if (AISLE_AFTER_ROWS.has(row)) {
        const gap = document.createElement("div");
        gap.className = "hall-cross-aisle";
        gap.setAttribute("aria-hidden", "true");
        gap.innerHTML = '<span class="aisle-plant"></span><span class="aisle-plant"></span>';
        body.appendChild(gap);
      }
    });

    container.appendChild(body);
    container.dataset.totalSeats = String(TOTAL_SEATS);
    return TOTAL_SEATS;
  }

  const api = {
    ROWS,
    SEATS_PER_ROW,
    TOTAL_SEATS,
    COLUMNS,
    SECTIONS,
    SECTION_ORDER,
    DEFAULT_SECTION_OPEN,
    categoryLabel,
    sectionForRow,
    sectionForSeat,
    parseSeat,
    seatInfo,
    sectionMeta,
    renderHall,
  };

  if (typeof window !== "undefined") window.CCHall = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
