// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-stock/page.js
//
// UPDATE: Stock Batches table columns are now user-selectable via a
// "Columns" card (checkboxes, Select All / Reset to Default), so a busy
// table can be trimmed down to just what's needed. Defaults to:
//   Date, Buyer, Season, Style/Model, W/H, Item Code/PDM, Color, Location,
//   Recv. Roll, Recv. Yds, Avail. Roll, Roll %, Avail. Yds, Yds %
// (Invoice No., Item, and the two mini-donut chart columns are still
// available to add back in via the picker.)
//
// UPDATE: table color scheme replaced -- the previous header/row palette
// (dull tan/beige) is swapped for a richer amber-to-teal gradient header,
// warmer alternating row tint, and colored column accents so the table
// reads livelier at a glance. Roll % / Yds % now render as a bold,
// slightly-larger AMBER/YELLOW percentage figure (in addition to the
// small donut) so "how much is left" jumps out immediately.
//
// Style / Model cells now render each pair on its own line as
// "Style | Model" (pipe-separated) instead of "Style / Model", and
// multiple pairs stack vertically instead of being comma-joined, per the
// "next style | model" request.

"use client";

import { Boxes, ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens -- richer amber/teal theme (replaces the old
   dull tan palette specifically for this page's table chrome).
   Non-table surfaces (cards, inputs, buttons) keep the app-wide warm
   HKD theme so the page still matches its siblings.
   ============================================================ */

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-sm text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-colors";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-sm px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-sm px-3 py-1.5 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[0.85em] bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e] max-w-full truncate";

const emptyFilters = {
  itemCodePdm: "", style: "", color: "", model: "", season: "",
  buyer: "", invoiceNo: "", item: "", warehouse: "", location: "",
};

const STOCK_FILTER_FIELDS = [
  { key: "itemCodePdm", label: "Item Code/PDM" },
  { key: "style", label: "Style" },
  { key: "model", label: "Model" },
  { key: "color", label: "Color" },
  { key: "season", label: "Season" },
  { key: "buyer", label: "Buyer" },
  { key: "invoiceNo", label: "Invoice No." },
  { key: "item", label: "Item" },
  { key: "warehouse", label: "Warehouse" },
  { key: "location", label: "Location" },
];

/* ============================================================
   Number helpers
   ============================================================ */

const formatNum = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? "";
  return n % 1 === 0
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const numFontSize = (text) => {
  const len = String(text).length;
  if (len <= 4) return "1.1em";
  if (len <= 6) return "0.95em";
  if (len <= 8) return "0.8em";
  return "0.68em";
};

/* ============================================================
   Summary strip -- unchanged behavior, restyled to match the new
   livelier header colors.
   ============================================================ */

function SummaryStrip({ summary }) {
  const [hidden, setHidden] = useState(true);
  const [query, setQuery] = useState("");

  if (!summary?.length) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? summary.filter(
        (s) =>
          s.itemCodePdm?.toLowerCase().includes(q) ||
          s.color?.toLowerCase().includes(q)
      )
    : summary;

  return (
    <div className={`${card} p-3`}>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">
          Total Available{" "}
          <span className="text-xs font-sans text-[#a08060]">
            (across all invoices, by Item Code/PDM + Color)
          </span>
          <span className="ml-2 text-xs font-sans text-[#a08060]">
            ({filtered.length}{q ? ` of ${summary.length}` : ""})
          </span>
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!hidden && (
            <div className="relative flex-1 sm:flex-none">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a08060]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Item Code/PDM or Color..."
                className={`${inputCls} !py-1 !pl-6 text-sm w-full sm:w-64`}
              />
            </div>
          )}
          <button type="button" onClick={() => setHidden((h) => !h)} className={btnSecondary}>
            {hidden ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!hidden && (
        filtered.length === 0 ? (
          <div className="text-sm italic text-[#a08060] px-1 py-2">No matches.</div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-lg border border-[#2c2417]/8 dark:border-[#e8ddd0]/8">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gradient-to-r from-[#b87a4a] to-[#8a4a24] dark:from-[#6a4a2a] dark:to-[#4a3018] text-white backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left">Item Code/PDM</th>
                  <th className="px-3 py-2 text-left">Color</th>
                  <th className="px-3 py-2 text-right">Available Roll</th>
                  <th className="px-3 py-2 text-right">Available Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const rollText = formatNum(s.totalAvailableRoll);
                  const ydsText = formatNum(s.totalAvailableYds);
                  return (
                    <tr
                      key={`${s.itemCodePdm}-${s.color}`}
                      className={`border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/10 ${i % 2 === 1 ? "bg-[#b87a4a]/[0.04] dark:bg-[#d4955e]/[0.04]" : ""}`}
                    >
                      <td className="px-3 py-2 text-[#8a4a24] dark:text-[#d4955e] whitespace-nowrap">
                        {s.itemCodePdm}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{s.color}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-[#3d7a4a] dark:text-[#8fca9c]">
                        <span style={{ fontSize: numFontSize(rollText) }} title={rollText}>{rollText}</span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-[#3d7a4a] dark:text-[#8fca9c]">
                        <span style={{ fontSize: numFontSize(ydsText) }} title={ydsText}>{ydsText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/* ============================================================
   Filter bar -- unchanged behavior
   ============================================================ */

function FilterBar({ filters, setFilters, loading, onSearch, onReset }) {
  const [hidden, setHidden] = useState(true);
  const activeCount = Object.values(filters).filter((v) => v && v.trim()).length;

  const handleSearch = (e) => {
    onSearch(e);
    setHidden(true);
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div className={`${card} p-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-[#b87a4a]" />
          <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Filters</h2>
          {activeCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]">
              {activeCount} active
            </span>
          )}
        </div>
        <button type="button" onClick={() => setHidden((h) => !h)} className={btnSecondary}>
          {hidden ? (
            <>
              <ChevronDown size={14} /> Show Filters
            </>
          ) : (
            <>
              <ChevronUp size={14} /> Hide Filters
            </>
          )}
        </button>
      </div>

      {!hidden && (
        <form onSubmit={handleSearch} className="mt-3">
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {STOCK_FILTER_FIELDS.map((f) => (
              <label key={f.key} className="min-w-0">
                <span className="block mb-0.5 text-[11px] uppercase tracking-wide text-[#a08060] whitespace-nowrap">
                  {f.label}
                </span>
                <input
                  type="text"
                  value={filters[f.key]}
                  onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                  placeholder={f.label}
                  className={`${inputCls} text-sm py-1`}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-1.5 mt-3">
            <button type="submit" disabled={loading} className={`${btnPrimary} px-4 whitespace-nowrap`}>
              {loading ? "..." : "Search"}
            </button>
            <button type="button" onClick={handleReset} className={`${btnSecondary} whitespace-nowrap`}>
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ============================================================
   Mini donut chart -- unchanged, colors slightly punched up.
   ============================================================ */

function MiniDonut({ percent, size = 28, strokeWidth = 5 }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={strokeWidth}
        className="stroke-[#2c2417]/12 dark:stroke-[#e8ddd0]/15"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-[#e0a838] dark:stroke-[#f0c868] transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

/* ============================================================
   Column definitions -- the FULL pool of selectable columns.
   `defaultOn` marks the columns shown out of the box.
   ============================================================ */

const ALL_STOCK_COLUMNS = [
  { key: "date", label: "Date", width: 6, defaultOn: true },
  { key: "invoiceNo", label: "Invoice No.", width: 7, defaultOn: false },
  { key: "buyer", label: "Buyer", width: 8, defaultOn: true },
  { key: "season", label: "Season", width: 6, defaultOn: true },
  { key: "styleModel", label: "Style / Model", width: 11, defaultOn: true },
  { key: "warehouse", label: "W/H", width: 5, defaultOn: true },
  { key: "item", label: "Item", width: 7, defaultOn: false },
  { key: "itemCodePdm", label: "Item Code/PDM", width: 9, defaultOn: true },
  { key: "color", label: "Color", width: 7, defaultOn: true },
  { key: "location", label: "Location", width: 6, defaultOn: true },
  { key: "receivedRoll", label: "Recv. Roll", width: 6, align: "right", defaultOn: true },
  { key: "receivedYds", label: "Recv. Yds", width: 6, align: "right", defaultOn: true },
  { key: "availableRoll", label: "Avail. Roll", width: 6, align: "right", defaultOn: true },
  { key: "rollChart", label: "Roll %", width: 6, align: "center", defaultOn: true },
  { key: "availableYds", label: "Avail. Yds", width: 6, align: "right", defaultOn: true },
  { key: "ydsChart", label: "Yds %", width: 6, align: "center", defaultOn: true },
];

const DEFAULT_VISIBLE_KEYS = ALL_STOCK_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key);

const TABLE_FONT_STYLE = { fontSize: "clamp(0.6rem, 0.45rem + 0.55vw, 0.875rem)" };
const CELL_PAD = "px-[clamp(2px,0.5vw,10px)] py-[clamp(3px,0.45vw,8px)]";
const DONUT_BOX = { width: "clamp(14px, 2vw, 26px)", height: "clamp(14px, 2vw, 26px)" };

/* ============================================================
   ColumnPicker -- a card with a checkbox per selectable column,
   "Select All" / "Reset to Default" / "Hide All" shortcuts. Starts
   collapsed so it stays out of the way once columns are set the way
   the user wants.
   ============================================================ */

function ColumnPicker({ visibleKeys, setVisibleKeys }) {
  const [hidden, setHidden] = useState(true);

  const toggle = (key) =>
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectAll = () => setVisibleKeys(ALL_STOCK_COLUMNS.map((c) => c.key));
  const resetDefault = () => setVisibleKeys(DEFAULT_VISIBLE_KEYS);

  return (
    <div className={`${card} p-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#3d8a7a] dark:text-[#6fd0b8]" />
          <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Columns</h2>
          <span className="text-xs text-[#a08060]">({visibleKeys.length} of {ALL_STOCK_COLUMNS.length} shown)</span>
        </div>
        <button type="button" onClick={() => setHidden((h) => !h)} className={btnSecondary}>
          {hidden ? (
            <>
              <ChevronDown size={14} /> Choose Columns
            </>
          ) : (
            <>
              <ChevronUp size={14} /> Hide
            </>
          )}
        </button>
      </div>

      {!hidden && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={selectAll} className={btnSecondary}>Select All</button>
            <button type="button" onClick={resetDefault} className={btnSecondary}>Reset to Default</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ALL_STOCK_COLUMNS.map((c) => {
              const on = visibleKeys.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={`flex items-center gap-2 rounded-lg border-[1.5px] px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    on
                      ? "border-[#3d8a7a] dark:border-[#6fd0b8] bg-[#3d8a7a]/10 dark:bg-[#6fd0b8]/10 text-[#2c6a5a] dark:text-[#6fd0b8]"
                      : "border-[#2c2417]/15 dark:border-[#e8ddd0]/15 text-[#7a6250] dark:text-[#a8917d] hover:border-[#3d8a7a]/50"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] ${on ? "bg-[#3d8a7a] dark:bg-[#6fd0b8] border-[#3d8a7a] dark:border-[#6fd0b8]" : "border-[#2c2417]/25 dark:border-[#e8ddd0]/25"}`}>
                    {on && <Check size={11} className="text-white dark:text-[#1b1712]" />}
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Results table cells
   ============================================================ */

function Cell({ children, align, title, className = "" }) {
  return (
    <td
      className={`${CELL_PAD} ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} overflow-hidden ${className}`}
    >
      <div className={`truncate ${align === "center" ? "flex items-center justify-center" : ""}`} title={title}>
        {children}
      </div>
    </td>
  );
}

function NumCell({ value }) {
  const text = formatNum(value);
  return (
    <td className={`${CELL_PAD} text-right overflow-hidden text-[#2c2417] dark:text-[#e8ddd0]`}>
      <div className="truncate" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

function AvailCell({ value }) {
  const text = formatNum(value);
  return (
    <td className={`${CELL_PAD} text-right overflow-hidden text-[#2c8a6a] dark:text-[#7fd8a8] font-medium`}>
      <div className="truncate" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

// Roll % / Yds % -- a bold, slightly-larger AMBER/YELLOW percentage
// figure sits next to a small donut, so "how much is left" reads at a
// glance instead of needing to compare Avail. vs Recv. columns manually.
function PercentCell({ percent, title }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <td className={`${CELL_PAD} overflow-hidden`}>
      <div className="flex items-center justify-center gap-1" title={title}>
        <div style={DONUT_BOX}>
          <MiniDonut percent={clamped} />
        </div>
        <span
          className="font-bold text-[#c88a12] dark:text-[#f0c868]"
          style={{ fontSize: "clamp(0.75rem, 0.6rem + 0.4vw, 1.05rem)" }}
        >
          {clamped}%
        </span>
      </div>
    </td>
  );
}

// Style / Model -- each pair renders as its own line, "Style | Model"
// (pipe-separated). With several pairs, they stack vertically; a small
// "+N more" toggle keeps the row from growing too tall by default.
function StyleModelCell({ styles }) {
  const [expanded, setExpanded] = useState(false);
  const list = styles || [];
  const visible = expanded ? list : list.slice(0, 1);
  const hiddenCount = list.length - visible.length;
  const fullText = list.map((s) => `${s.style}${s.model ? ` | ${s.model}` : ""}`).join("\n");

  return (
    <td className={`${CELL_PAD} overflow-hidden align-top`}>
      <div title={fullText}>
        <div className="flex flex-col gap-0.5">
          {visible.map((s) => (
            <span key={s.id ?? `${s.style}-${s.model ?? ""}`} className="text-[0.95em] text-[#1a1208] dark:text-[#f0e8dc]">
              <span className="font-semibold text-[#8a4a24] dark:text-[#d4955e]">{s.style}</span>
              {s.model ? <span className="text-[#a08060]"> {"|"} {s.model}</span> : null}
            </span>
          ))}
        </div>
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-0.5 inline-flex items-center gap-0.5 text-[0.75em] text-[#3d8a7a] dark:text-[#6fd0b8] hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp size={10} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={10} /> +{hiddenCount} more
              </>
            )}
          </button>
        )}
      </div>
    </td>
  );
}

function renderStockCell(colKey, r, rollPct, ydsPct) {
  switch (colKey) {
    case "date":
      return <Cell key="date" title={r.date?.slice(0, 10)}>{r.date?.slice(0, 10)}</Cell>;
    case "invoiceNo":
      return (
        <Cell key="invoiceNo" title={r.invoiceNo} className="text-[#1a1208] dark:text-[#f0e8dc]">
          {r.invoiceNo}
        </Cell>
      );
    case "buyer":
      return <Cell key="buyer" title={r.buyer}>{r.buyer}</Cell>;
    case "season":
      return <Cell key="season" title={r.season}>{r.season}</Cell>;
    case "styleModel":
      return <StyleModelCell key="styleModel" styles={r.styles} />;
    case "warehouse":
      return (
        <Cell key="warehouse" title={r.warehouse}>
          <span className={chip}>{r.warehouse}</span>
        </Cell>
      );
    case "item":
      return <Cell key="item" title={r.item}>{r.item}</Cell>;
    case "itemCodePdm":
      return (
        <Cell key="itemCodePdm" title={r.itemCodePdm} className="text-[#8a4a24] dark:text-[#d4955e] font-medium">
          {r.itemCodePdm}
        </Cell>
      );
    case "color":
      return <Cell key="color" title={r.color}>{r.color}</Cell>;
    case "location":
      return (
        <Cell key="location" title={r.location}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.85em] bg-[#3d8a7a]/12 text-[#2c6a5a] dark:bg-[#6fd0b8]/15 dark:text-[#6fd0b8]">
            {r.location}
          </span>
        </Cell>
      );
    case "receivedRoll":
      return <NumCell key="receivedRoll" value={r.rollQty} />;
    case "receivedYds":
      return <NumCell key="receivedYds" value={r.yds} />;
    case "availableRoll":
      return <AvailCell key="availableRoll" value={r.availableRoll} />;
    case "rollChart":
      return <PercentCell key="rollChart" percent={rollPct} title={`${rollPct}% of received roll still available`} />;
    case "availableYds":
      return <AvailCell key="availableYds" value={r.availableYds} />;
    case "ydsChart":
      return <PercentCell key="ydsChart" percent={ydsPct} title={`${ydsPct}% of received yds still available`} />;
    default:
      return null;
  }
}

/* ============================================================
   Results table -- header now uses a livelier amber -> teal
   gradient (was a flat dull tan), rows alternate with a soft warm
   tint, and hovers pick up a stronger highlight.
   ============================================================ */

function ResultsTable({ rows, loading, searched, visibleKeys }) {
  const columns = useMemo(
    () => ALL_STOCK_COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys]
  );
  // Re-normalize widths so whatever subset is chosen still sums to ~100%.
  const totalWidth = columns.reduce((s, c) => s + c.width, 0) || 1;

  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 bg-gradient-to-r from-[#b87a4a]/10 to-[#3d8a7a]/10">
        <Boxes size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-lg text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
        <span className="text-sm text-[#a08060]">({rows.length})</span>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden max-h-[65vh] no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-sm px-4">
            {searched ? "No stock batches match these filters." : "Enter filters and search, or search with everything blank to see all available stock."}
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-sm px-4">
            No columns selected -- use "Choose Columns" above to pick at least one.
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed" style={TABLE_FONT_STYLE}>
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={{ width: `${(c.width / totalWidth) * 100}%` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 bg-gradient-to-r from-[#b87a4a] via-[#a8703f] to-[#3d8a7a] dark:from-[#6a4a2a] dark:via-[#5a4020] dark:to-[#2c6a5a] text-white backdrop-blur shadow-sm">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${CELL_PAD} overflow-hidden font-semibold ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                  >
                    <div className="truncate" title={c.label}>{c.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rollPct = r.rollQty ? Math.round((r.availableRoll / r.rollQty) * 100) : 0;
                const ydsPct = r.yds ? Math.round((r.availableYds / r.yds) * 100) : 0;
                return (
                  <tr
                    key={r.itemId}
                    className={`border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#3d8a7a]/10 dark:hover:bg-[#6fd0b8]/10 transition-colors ${
                      i % 2 === 1 ? "bg-[#b87a4a]/[0.05] dark:bg-[#d4955e]/[0.05]" : "bg-transparent"
                    }`}
                  >
                    {columns.map((c) => renderStockCell(c.key, r, rollPct, ydsPct))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   Main page
   ============================================================ */

export default function MaterialStockPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE_KEYS);

  const runSearch = useCallback(async (f) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v && v.trim()) params.set(k, v.trim()); });
      const qs = params.toString();
      const res = await fetch(`${API_URL}/material-stock${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search material stock");
      const data = await res.json();
      setRows(data.rows || []);
      setSummary(data.summary || []);
      setSearched(true);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  // Load full available stock on first visit.
  useEffect(() => { runSearch(emptyFilters); }, [runSearch]);

  const handleSubmit = (e) => { e.preventDefault(); runSearch(filters); };
  const handleReset = () => { setFilters(emptyFilters); runSearch(emptyFilters); };

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        <div className="flex items-center gap-2">
          <Search size={22} className="text-[#b87a4a] shrink-0" />
          <h1 className="font-serif text-xl sm:text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
            Material Stock <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Search</em>
          </h1>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-sm px-3 py-2"><b>Error:</b> {error}</div>}

        <FilterBar
          filters={filters}
          setFilters={setFilters}
          loading={loading}
          onSearch={handleSubmit}
          onReset={handleReset}
        />

        <ColumnPicker visibleKeys={visibleKeys} setVisibleKeys={setVisibleKeys} />

        <div className="space-y-4">
          <SummaryStrip summary={summary} />
          <ResultsTable rows={rows} loading={loading} searched={searched} visibleKeys={visibleKeys} />
        </div>
      </div>
    </div>
  );
}