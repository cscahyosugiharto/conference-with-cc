#!/usr/bin/env node
"use strict";

const hall = require("../hall.js");
const assert = require("assert");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
}

check("300 seats across 15 rows of 20", () => {
  assert.strictEqual(hall.ROWS.length, 15);
  assert.strictEqual(hall.SEATS_PER_ROW, 20);
  assert.strictEqual(hall.TOTAL_SEATS, 300);
  assert.strictEqual(hall.ROWS.join(""), "ABCDEFGHIJKLMNO");
});

check("aisle blocks are 6 / 8 / 6", () => {
  assert.deepStrictEqual(hall.COLUMNS.map((col) => [col.start, col.end]), [
    [1, 6],
    [7, 14],
    [15, 20],
  ]);
});

check("section sizes match the official legend", () => {
  assert.strictEqual(hall.SECTIONS.gold.count, 140);
  assert.strictEqual(hall.SECTIONS.blue.count, 60);
  assert.strictEqual(hall.SECTIONS.gray.count, 100);
  assert.strictEqual(hall.SECTIONS.gold.rows.length * 20, 140);
  assert.strictEqual(hall.SECTIONS.blue.rows.length * 20, 60);
  assert.strictEqual(hall.SECTIONS.gray.rows.length * 20, 100);
});

check("rows map to gold, blue, and gray", () => {
  ["A", "G"].forEach((row) => assert.strictEqual(hall.sectionForRow(row), "gold"));
  ["H", "J"].forEach((row) => assert.strictEqual(hall.sectionForRow(row), "blue"));
  ["K", "O"].forEach((row) => assert.strictEqual(hall.sectionForRow(row), "gray"));
});

check("official seat codes parse and old hyphen codes do not occupy them", () => {
  assert.deepStrictEqual(hall.parseSeat("A1"), {
    row: "A", num: 1, section: "gold", code: "A1",
  });
  assert.deepStrictEqual(hall.parseSeat("J14"), {
    row: "J", num: 14, section: "blue", code: "J14",
  });
  assert.deepStrictEqual(hall.parseSeat("O20"), {
    row: "O", num: 20, section: "gray", code: "O20",
  });
  assert.strictEqual(hall.parseSeat("A-01"), null);
  assert.strictEqual(hall.parseSeat("B-01"), null);
  assert.strictEqual(hall.parseSeat("A0"), null);
  assert.strictEqual(hall.parseSeat("A21"), null);
  assert.strictEqual(hall.parseSeat("P1"), null);
});

check("default gates are gold open, blue and gray closed", () => {
  assert.deepStrictEqual(hall.DEFAULT_SECTION_OPEN, {
    gold: true,
    blue: false,
    gray: false,
  });
});

check("every generated seat is unique and counted", () => {
  const codes = new Set();
  hall.ROWS.forEach((row) => {
    for (let n = 1; n <= hall.SEATS_PER_ROW; n += 1) {
      const info = hall.seatInfo(`${row}${n}`);
      assert.ok(info, `missing ${row}${n}`);
      codes.add(info.code);
    }
  });
  assert.strictEqual(codes.size, 300);
});

check("renderHall paints 300 seats with the official aisle structure", () => {
  global.document = {
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        children: [],
        className: "",
        classList: { add() {} },
        dataset: {},
        style: {},
        textContent: "",
        innerHTML: "",
        appendChild(child) {
          this.children.push(child);
          return child;
        },
        setAttribute() {},
      };
      return el;
    },
  };
  const container = global.document.createElement("div");
  const total = hall.renderHall(container);
  assert.strictEqual(total, 300);
  const seats = [];
  const walk = (node) => {
    if (!node || !node.children) return;
    if (/\bseat\b/.test(node.className)) seats.push(node);
    node.children.forEach(walk);
  };
  walk(container);
  assert.strictEqual(seats.length, 300);
  assert.strictEqual(seats.filter((seat) => seat.dataset.category === "gold").length, 140);
  assert.strictEqual(seats.filter((seat) => seat.dataset.category === "blue").length, 60);
  assert.strictEqual(seats.filter((seat) => seat.dataset.category === "gray").length, 100);
  assert.strictEqual(seats[0].dataset.code, "A1");
  assert.strictEqual(seats[seats.length - 1].dataset.code, "O20");
  delete global.document;
});

if (process.exitCode) {
  console.error("Layout verification failed.");
  process.exit(process.exitCode);
}

console.log("Layout verification passed.");
