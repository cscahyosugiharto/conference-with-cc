(() => {
  const BLOCKS = [
    { id: "B", name: "Front Left", category: "standard", rows: 2, cols: 4 },
    { id: "A", name: "Front Center", category: "premium", rows: 2, cols: 8 },
    { id: "C", name: "Front Right", category: "standard", rows: 2, cols: 4 },
    { id: "D", name: "Middle Left", category: "premium", rows: 3, cols: 6 },
    { id: "E", name: "Middle Center", category: "premium", rows: 3, cols: 8 },
    { id: "F", name: "Middle Right", category: "premium", rows: 3, cols: 6 },
    { id: "G", name: "Rear Left", category: "standard", rows: 3, cols: 6 },
    { id: "H", name: "Rear Center", category: "standard", rows: 3, cols: 6 },
    { id: "I", name: "Rear Right", category: "standard", rows: 3, cols: 6 },
    { id: "J", name: "Back Left", category: "standard", rows: 3, cols: 6 },
    { id: "K", name: "Back Center", category: "standard", rows: 3, cols: 6 },
    { id: "L", name: "Back Right", category: "standard", rows: 3, cols: 6 },
  ];

  const ORDER = ["B", "A", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const blockById = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

  function categoryLabel(category) {
    return category === "premium" ? "Gold" : "Blue";
  }

  function renderHall(container, { selectable = true } = {}) {
    container.innerHTML = "";
    let total = 0;
    ORDER.forEach((id) => {
      const block = blockById[id];
      const wrap = document.createElement("div");
      wrap.className = "block";
      wrap.dataset.block = id;

      const label = document.createElement("div");
      label.className = "block-label";
      label.textContent = id;
      wrap.appendChild(label);

      const grid = document.createElement("div");
      grid.className = "seats";
      grid.style.gridTemplateColumns = `repeat(${block.cols}, auto)`;

      let n = 0;
      for (let r = 0; r < block.rows; r += 1) {
        for (let c = 0; c < block.cols; c += 1) {
          n += 1;
          total += 1;
          const code = `${id}-${String(n).padStart(2, "0")}`;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `seat ${block.category}`;
          btn.dataset.code = code;
          btn.dataset.block = id;
          btn.dataset.category = block.category;
          btn.setAttribute("aria-label", `Seat ${code}, ${categoryLabel(block.category)}`);
          btn.setAttribute("aria-pressed", "false");
          btn.title = code;
          if (!selectable) btn.tabIndex = 0;
          grid.appendChild(btn);
        }
      }

      wrap.appendChild(grid);
      container.appendChild(wrap);
    });

    container.dataset.totalSeats = String(total);
    return total;
  }

  window.CCHall = { BLOCKS, ORDER, blockById, categoryLabel, renderHall };
})();
