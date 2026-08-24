// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-stock/page.js

//
// NOTE: this page uses @tanstack/react-table for the results grid
// (click any column header to sort, built-in pagination model handles
// paging). If it isn't already in package.json:
//   npm install @tanstack/react-table
//
// CHANGE (this revision): the right-hand filter sidebar (FilterOverlay)
// has been removed. In its place, small inline search boxes sit right
// under the "Material Stock / Search and manage inventory" header, one
// per filterable field, in a compact responsive grid. The results table
// also now paginates (rows-per-page selector + prev/next/first/last),
// instead of one long scrolling list.
//
// Visual theme: cooler navy/steel-blue "ERP grid" look: solid dark header
// bar, real cell borders, tight zebra striping, monospace figures. Blue =
// primary actions/sorting/filters, teal = secondary "Columns" affordance,
// green = available stock.

"use client";

import { ArrowUpDown, Boxes, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ============================================================
// Styles - ERP Navy/Steel-Blue Theme
// ============================================================

const card = "bg-white dark:bg-[#0b1120] border border-[#d7dbe3] dark:border-[#1e293b] rounded-lg shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#c7ccd6] dark:border-[#334155] bg-white dark:bg-[#111827] px-3 py-2 text-sm text-[#1e293b] dark:text-[#e2e8f0] placeholder:text-[#94a3b8] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb] dark:focus:border-[#3b82f6] transition-all";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-[#101a2c] dark:bg-[#2563eb] text-white text-sm px-4 py-2 hover:bg-[#1e3a5f] dark:hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 font-medium";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#c7ccd6] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#475569] dark:text-[#94a3b8] text-sm px-3 py-2 hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:border-[#3b82f6] dark:hover:text-[#3b82f6] transition-colors disabled:opacity-40 disabled:pointer-events-none font-medium";
const btnIcon =
  "inline-flex items-center justify-center rounded-md border-[1.5px] border-[#c7ccd6] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#475569] dark:text-[#94a3b8] w-8 h-8 hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:border-[#3b82f6] dark:hover:text-[#3b82f6] transition-colors disabled:opacity-30 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#2563eb]/10 text-[#1d4ed8] dark:bg-[#3b82f6]/15 dark:text-[#60a5fa] max-w-full truncate";
const chipTeal = "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#14b8a6]/15 dark:text-[#2dd4bf] max-w-full truncate";

const emptyFilters = {
  itemCodePdm: "", style: "", color: "", model: "", season: "",
  buyer: "", invoiceNo: "", item: "", warehouse: "", location: "",
  supplier: "", fabricDetails: "",
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
  { key: "supplier", label: "Supplier" },
  { key: "fabricDetails", label: "Fabric Details" },
];

// ============================================================
// Helpers
// ============================================================

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

// ============================================================
// Mini Donut Chart
// ============================================================

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
        className="stroke-[#1e293b]/10 dark:stroke-[#e2e8f0]/12"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-[#2563eb] dark:stroke-[#60a5fa] transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

// ============================================================
// Column Definitions
// ============================================================

const ALL_STOCK_COLUMNS = [
  { key: "date", label: "Date", width: 6, defaultOn: true },
  { key: "invoiceNo", label: "Invoice No.", width: 7, defaultOn: false },
  { key: "buyer", label: "Buyer", width: 8, defaultOn: true },
  { key: "season", label: "Season", width: 6, defaultOn: false },
  { key: "styleModel", label: "Style | Model", width: 11, defaultOn: true },
  { key: "warehouse", label: "W/H", width: 5, defaultOn: false },
  { key: "item", label: "Item", width: 7, defaultOn: false },
  { key: "itemCodePdm", label: "Item Code/PDM", width: 9, defaultOn: true },
  { key: "color", label: "Color", width: 7, defaultOn: true },
  { key: "fabricDetails", label: "Fabric Details", width: 8, defaultOn: false },
  { key: "supplier", label: "Supplier", width: 8, defaultOn: false },
  { key: "location", label: "Location", width: 6, defaultOn: true },
  { key: "receivedRoll", label: "Recv. Roll", width: 6, align: "right", defaultOn: true },
  { key: "receivedYds", label: "Recv. Yds", width: 6, align: "right", defaultOn: true },
  { key: "availableRoll", label: "Avail. Roll", width: 6, align: "right", defaultOn: true },
  { key: "rollChart", label: "Roll %", width: 6, align: "center", defaultOn: true },
  { key: "availableYds", label: "Avail. Yds", width: 6, align: "right", defaultOn: true },
  { key: "ydsChart", label: "Yds %", width: 6, align: "center", defaultOn: true },
];

const DEFAULT_VISIBLE_KEYS = ALL_STOCK_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key);

// Which columns the user has chosen to show, kept in the browser's
// localStorage so the choice survives a refresh.
const VISIBLE_COLUMNS_KEY = "materialStock:visibleColumns";
function loadVisibleColumns() {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_KEYS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(VISIBLE_COLUMNS_KEY));
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_VISIBLE_KEYS;
  } catch {
    return DEFAULT_VISIBLE_KEYS;
  }
}

const TABLE_FONT_STYLE = { fontSize: "clamp(0.6rem, 0.45rem + 0.55vw, 0.875rem)" };
const CELL_PAD = "px-[clamp(2px,0.5vw,10px)] py-[clamp(3px,0.45vw,8px)]";
const DONUT_BOX = { width: "clamp(14px, 2vw, 26px)", height: "clamp(14px, 2vw, 26px)" };

// ============================================================
// Summary Strip
// ============================================================

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
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="font-semibold tracking-tight text-base text-[#0f172a] dark:text-[#e2e8f0]">
          Total Available
          <span className="ml-2 text-sm font-normal text-[#64748b]">
            ({filtered.length}{q ? ` of ${summary.length}` : ""})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {!hidden && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item or color..."
              className={`${inputCls} !py-1.5 text-sm w-48`}
            />
          )}
          <button type="button" onClick={() => setHidden((h) => !h)} className={btnSecondary}>
            {hidden ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!hidden && (
        filtered.length === 0 ? (
          <div className="text-sm italic text-[#94a3b8] px-1 py-2">No matches.</div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-md border border-[#d7dbe3] dark:border-[#1e293b]">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-[#101a2c] dark:bg-[#0f172a] text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold border-r border-white/10">Item Code/PDM</th>
                  <th className="px-4 py-2.5 text-left font-semibold border-r border-white/10">Color</th>
                  <th className="px-4 py-2.5 text-right font-semibold border-r border-white/10">Avail. Roll</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Avail. Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={`${s.itemCodePdm}-${s.color}`}
                    className={`border-t border-[#e5e8ee] dark:border-[#1e293b] hover:bg-[#eaf1fd] dark:hover:bg-[#1e293b]/50 transition-colors ${i % 2 === 0 ? "bg-white dark:bg-[#0b1120]" : "bg-[#f7f8fa] dark:bg-[#0f172a]/40"
                      }`}
                  >
                    <td className="px-4 py-2 text-[#1d4ed8] dark:text-[#60a5fa] font-medium border-r border-[#eef0f4] dark:border-[#1e293b]/60">{s.itemCodePdm}</td>
                    <td className="px-4 py-2 text-[#1e293b] dark:text-[#e2e8f0] border-r border-[#eef0f4] dark:border-[#1e293b]/60">{s.color}</td>
                    <td className="px-4 py-2 text-right text-[#16a34a] dark:text-[#4ade80] font-medium font-mono border-r border-[#eef0f4] dark:border-[#1e293b]/60">
                      <span style={{ fontSize: numFontSize(s.totalAvailableRoll) }}>{formatNum(s.totalAvailableRoll)}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-[#16a34a] dark:text-[#4ade80] font-medium font-mono">
                      <span style={{ fontSize: numFontSize(s.totalAvailableYds) }}>{formatNum(s.totalAvailableYds)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ============================================================
// Inline Filters -- small search boxes sitting right under the page
// header, replacing the old right-hand FilterOverlay sidebar. One
// compact input per filterable field, arranged in a responsive grid.
// ============================================================

function InlineFilters({ filters, setFilters, onSearch, onReset, loading }) {
  const activeCount = Object.values(filters).filter((v) => v && v.trim()).length;

  return (
    <form onSubmit={onSearch} className={`${card} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
          Search
          {activeCount > 0 && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-[#2563eb]/10 text-[#1d4ed8] dark:bg-[#3b82f6]/15 dark:text-[#60a5fa]">
              {activeCount} active
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className={btnPrimary}>
            <Search size={14} /> {loading ? "..." : "Search"}
          </button>
          <button type="button" onClick={onReset} className={btnSecondary}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {STOCK_FILTER_FIELDS.map((f) => (
          <input
            key={f.key}
            type="text"
            value={filters[f.key]}
            onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
            placeholder={f.label}
            title={f.label}
            className={`${inputCls} !py-1.5 !px-2.5 text-xs`}
          />
        ))}
      </div>
    </form>
  );
}

// ============================================================
// Columns picker -- small dropdown tile (not a full sidebar). Ticks
// which Stock Batches columns show; saved to localStorage so the
// choice is remembered next time.
// ============================================================

function ColumnsMenu({ visibleKeys, setVisibleKeys }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", closeIfOutside);
    return () => document.removeEventListener("mousedown", closeIfOutside);
  }, [open]);

  const toggle = (key) =>
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnSecondary}>
        <SlidersHorizontal size={16} /> Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-md border border-[#d7dbe3] dark:border-[#1e293b] bg-white dark:bg-[#0b1120] shadow-lg py-1 max-h-80 overflow-y-auto">
          <div className="flex gap-3 px-2.5 py-1.5 border-b border-[#eef0f4] dark:border-[#1e293b]">
            <button type="button" onClick={() => setVisibleKeys(ALL_STOCK_COLUMNS.map((c) => c.key))} className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf] hover:underline">Select All</button>
            <button type="button" onClick={() => setVisibleKeys(DEFAULT_VISIBLE_KEYS)} className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf] hover:underline ml-auto">Reset</button>
          </div>
          {ALL_STOCK_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#1e293b] dark:text-[#e2e8f0] hover:bg-[#0f766e]/10 cursor-pointer">
              <input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={() => toggle(c.key)} className="accent-[#0f766e]" />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Table cell primitives
// ============================================================

function Cell({ children, align, title, className = "" }) {
  return (
    <td
      className={`${CELL_PAD} border-r border-[#eef0f4] dark:border-[#1e293b]/60 last:border-r-0 ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} overflow-hidden ${className}`}
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
    <td className={`${CELL_PAD} border-r border-[#eef0f4] dark:border-[#1e293b]/60 last:border-r-0 text-right overflow-hidden text-[#1e293b] dark:text-[#e2e8f0]`}>
      <div className="truncate font-mono" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

function AvailCell({ value }) {
  const text = formatNum(value);
  return (
    <td className={`${CELL_PAD} border-r border-[#eef0f4] dark:border-[#1e293b]/60 last:border-r-0 text-right overflow-hidden text-[#16a34a] dark:text-[#4ade80] font-semibold`}>
      <div className="truncate font-mono" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

function PercentCell({ percent, title }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <td className={`${CELL_PAD} border-r border-[#eef0f4] dark:border-[#1e293b]/60 last:border-r-0 overflow-hidden`}>
      <div className="flex items-center justify-center gap-1.5" title={title}>
        <div style={DONUT_BOX}>
          <MiniDonut percent={clamped} />
        </div>
        <span
          className="font-bold text-[#2563eb] dark:text-[#60a5fa]"
          style={{ fontSize: "clamp(0.75rem, 0.6rem + 0.4vw, 1.05rem)" }}
        >
          {clamped}%
        </span>
      </div>
    </td>
  );
}

function StyleModelCell({ styles }) {
  const [expanded, setExpanded] = useState(false);
  const list = styles || [];
  const visible = expanded ? list : list.slice(0, 1);
  const hiddenCount = list.length - visible.length;
  const fullText = list.map((s) => `${s.style}${s.model ? ` | ${s.model}` : ""}`).join("\n");

  return (
    <td className={`${CELL_PAD} border-r border-[#eef0f4] dark:border-[#1e293b]/60 last:border-r-0 overflow-hidden align-top`}>
      <div title={fullText}>
        <div className="flex flex-col gap-0.5">
          {visible.map((s) => (
            <span key={s.id ?? `${s.style}-${s.model ?? ""}`} className="text-[0.95em] text-[#1e293b] dark:text-[#e2e8f0]">
              <span className="font-semibold text-[#1d4ed8] dark:text-[#60a5fa]">{s.style}</span>
              {s.model ? <span className="text-[#94a3b8]"> {"|"} {s.model}</span> : null}
            </span>
          ))}
        </div>
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
          >
            {expanded ? (
              <><ChevronUp size={12} /> Show less</>
            ) : (
              <><ChevronDown size={12} /> +{hiddenCount} more</>
            )}
          </button>
        )}
      </div>
    </td>
  );
}

// Numeric/string value used purely for sorting a given column -- kept
// separate from the display cell (renderStockCell below) since a couple
// of columns (Style/Model, Roll %, Yds %) are computed/composite and
// don't have a single raw field to sort on directly.
function getSortValue(colKey, r) {
  switch (colKey) {
    case "date": return r.date || "";
    case "invoiceNo": return r.invoiceNo || "";
    case "buyer": return r.buyer || "";
    case "season": return r.season || "";
    case "styleModel": return r.styles?.[0]?.style || "";
    case "warehouse": return r.warehouse || "";
    case "item": return r.item || "";
    case "itemCodePdm": return r.itemCodePdm || "";
    case "color": return r.color || "";
    case "fabricDetails": return r.fabricDetails || "";
    case "supplier": return r.supplier || "";
    case "location": return r.location || "";
    case "receivedRoll": return Number(r.rollQty) || 0;
    case "receivedYds": return Number(r.yds) || 0;
    case "availableRoll": return Number(r.availableRoll) || 0;
    case "rollChart": return r.rollQty ? Math.round((Number(r.availableRoll) / Number(r.rollQty)) * 100) : 0;
    case "availableYds": return Number(r.availableYds) || 0;
    case "ydsChart": return r.yds ? Math.round((Number(r.availableYds) / Number(r.yds)) * 100) : 0;
    default: return "";
  }
}

function renderStockCell(colKey, r) {
  switch (colKey) {
    case "date": return <Cell key="date" title={r.date?.slice(0, 10)}>{r.date?.slice(0, 10)}</Cell>;
    case "invoiceNo": return <Cell key="invoiceNo" title={r.invoiceNo}>{r.invoiceNo}</Cell>;
    case "buyer": return <Cell key="buyer" title={r.buyer}>{r.buyer}</Cell>;
    case "season": return <Cell key="season" title={r.season}>{r.season}</Cell>;
    case "styleModel": return <StyleModelCell key="styleModel" styles={r.styles} />;
    case "warehouse": return <Cell key="warehouse" title={r.warehouse}><span className={chip}>{r.warehouse}</span></Cell>;
    case "item": return <Cell key="item" title={r.item}>{r.item}</Cell>;
    case "itemCodePdm": return <Cell key="itemCodePdm" title={r.itemCodePdm} className="text-[#1d4ed8] dark:text-[#60a5fa] font-medium">{r.itemCodePdm}</Cell>;
    case "color": return <Cell key="color" title={r.color}>{r.color}</Cell>;
    case "fabricDetails": return <Cell key="fabricDetails" title={r.fabricDetails}>{r.fabricDetails || <span className="italic text-[#94a3b8]">-</span>}</Cell>;
    case "supplier": return <Cell key="supplier" title={r.supplier}>{r.supplier || <span className="italic text-[#94a3b8]">-</span>}</Cell>;
    case "location": return <Cell key="location" title={r.location}><span className={chipTeal}>{r.location}</span></Cell>;
    case "receivedRoll": return <NumCell key="receivedRoll" value={r.rollQty} />;
    case "receivedYds": return <NumCell key="receivedYds" value={r.yds} />;
    case "availableRoll": return <AvailCell key="availableRoll" value={r.availableRoll} />;
    case "rollChart": {
      const rollPct = r.rollQty ? Math.round((r.availableRoll / r.rollQty) * 100) : 0;
      return <PercentCell key="rollChart" percent={rollPct} title={`${rollPct}% of received roll still available`} />;
    }
    case "availableYds": return <AvailCell key="availableYds" value={r.availableYds} />;
    case "ydsChart": {
      const ydsPct = r.yds ? Math.round((r.availableYds / r.yds) * 100) : 0;
      return <PercentCell key="ydsChart" percent={ydsPct} title={`${ydsPct}% of received yds still available`} />;
    }
    default: return null;
  }
}

// ============================================================
// Pagination bar -- rows-per-page selector + first/prev/next/last,
// driven by @tanstack/react-table's built-in pagination state.
// ============================================================

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function PaginationBar({ table, totalRows }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(table.getPageCount(), 1);
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-[#d7dbe3] dark:border-[#1e293b] bg-[#f5f6f8] dark:bg-[#0f172a] text-sm">
      <div className="flex items-center gap-2 text-[#64748b]">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="rounded-md border-[1.5px] border-[#c7ccd6] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#1e293b] dark:text-[#e2e8f0] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="text-[#64748b]">
        {totalRows === 0 ? "0 rows" : `${from}–${to} of ${totalRows}`}
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" className={btnIcon} onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} title="First page">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" className={btnIcon} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} title="Previous page">
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-[#1e293b] dark:text-[#e2e8f0] font-medium text-xs whitespace-nowrap">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </span>
        <button type="button" className={btnIcon} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} title="Next page">
          <ChevronRight size={14} />
        </button>
        <button type="button" className={btnIcon} onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} title="Last page">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Results Table -- ERP grid, sortable + paginated via
// @tanstack/react-table
// ============================================================

function ResultsTable({ rows, loading, searched, visibleKeys }) {
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const tableColumns = useMemo(
    () =>
      ALL_STOCK_COLUMNS.filter((c) => visibleKeys.includes(c.key)).map((c) => ({
        id: c.key,
        accessorFn: (row) => getSortValue(c.key, row),
        header: c.label,
        cell: (info) => renderStockCell(c.key, info.row.original),
        meta: { align: c.align, width: c.width },
      })),
    [visibleKeys]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Jump back to page 1 whenever the underlying result set changes (new
  // search, filter, or reset) so the user isn't stranded on an empty page.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [rows]);

  const totalWidth = tableColumns.reduce((s, c) => s + c.meta.width, 0) || 1;

  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#d7dbe3] dark:border-[#1e293b] bg-[#f5f6f8] dark:bg-[#0f172a]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-[#101a2c]/5 dark:bg-white/5">
            <Boxes size={18} className="text-[#101a2c] dark:text-[#60a5fa]" />
          </div>
          <h2 className="font-semibold tracking-tight text-lg text-[#0f172a] dark:text-[#e2e8f0]">Stock Batches</h2>
          <span className="text-sm text-[#64748b] bg-[#1e293b]/5 dark:bg-[#e2e8f0]/5 px-2.5 py-0.5 rounded-full">
            {rows.length}
          </span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden max-h-[60vh]"
        style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
      >
        {loading ? (
          <div className="text-center py-12 text-[#64748b] text-sm">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#2563eb] border-t-transparent mb-2"></div>
            <div>Loading...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-[#64748b] text-sm px-4">
            {searched ? "No stock batches match these filters." : "Use the search boxes above to find stock."}
          </div>
        ) : tableColumns.length === 0 ? (
          <div className="text-center py-12 text-[#64748b] text-sm px-4">
            No columns selected — use Columns picker.
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed" style={TABLE_FONT_STYLE}>
            <colgroup>
              {tableColumns.map((c) => (
                <col key={c.id} style={{ width: `${(c.meta.width / totalWidth) * 100}%` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-[#101a2c] dark:bg-[#0f172a] border-b-2 border-[#2563eb]">
                  {headerGroup.headers.map((header) => {
                    const align = header.column.columnDef.meta?.align;
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`${CELL_PAD} border-r border-white/10 last:border-r-0 overflow-hidden font-semibold text-white/90 cursor-pointer select-none hover:bg-white/5 transition-colors ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
                          }`}
                      >
                        <div
                          className={`flex items-center gap-1 text-[0.9em] tracking-wide ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
                            }`}
                          title={header.column.columnDef.header}
                        >
                          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {sorted === "asc" ? (
                            <ChevronUp size={12} className="shrink-0 text-[#60a5fa]" />
                          ) : sorted === "desc" ? (
                            <ChevronDown size={12} className="shrink-0 text-[#60a5fa]" />
                          ) : (
                            <ArrowUpDown size={11} className="shrink-0 text-white/30" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-t border-[#e5e8ee] dark:border-[#1e293b] transition-colors duration-100 ${i % 2 === 0
                    ? "bg-white dark:bg-[#0b1120] hover:bg-[#eaf1fd] dark:hover:bg-[#1e293b]/50"
                    : "bg-[#f7f8fa] dark:bg-[#0f172a]/40 hover:bg-[#eaf1fd] dark:hover:bg-[#1e293b]/60"
                    }`}
                >
                  {row.getVisibleCells().map((cell) => flexRender(cell.column.columnDef.cell, cell.getContext()))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && rows.length > 0 && tableColumns.length > 0 && (
        <PaginationBar table={table} totalRows={rows.length} />
      )}

      <style jsx>{`
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #b3bac7;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #8a93a6;
        }
        .dark ::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .dark ::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function MaterialStockPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [visibleKeys, setVisibleKeys] = useState(DEFAULT_VISIBLE_KEYS);

  // Load the saved column choice once mounted (avoids an SSR/client
  // mismatch from reading localStorage up front), then keep it in sync.
  useEffect(() => { setVisibleKeys(loadVisibleColumns()); }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(visibleKeys));
  }, [visibleKeys]);

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

  useEffect(() => { runSearch(emptyFilters); }, [runSearch]);

  const handleSubmit = (e) => { e.preventDefault(); runSearch(filters); };
  const handleReset = () => { setFilters(emptyFilters); runSearch(emptyFilters); };

  return (
    <div className="min-h-screen bg-[#eef1f5] dark:bg-[#0a0f1a]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#101a2c] to-[#1e3a5f] dark:from-[#1e293b] dark:to-[#0f172a] text-white shadow-lg">
              <Search size={20} />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-xl sm:text-2xl text-[#0f172a] dark:text-[#e2e8f0]">
                Material Stock
              </h1>
              <p className="text-sm text-[#64748b]">Search and manage inventory</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ColumnsMenu visibleKeys={visibleKeys} setVisibleKeys={setVisibleKeys} />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-[#dc2626]/8 border border-[#dc2626]/25 text-[#b91c1c] dark:text-[#f87171] text-sm px-4 py-3">
            <b>Error:</b> {error}
          </div>
        )}

        <InlineFilters
          filters={filters}
          setFilters={setFilters}
          onSearch={handleSubmit}
          onReset={handleReset}
          loading={loading}
        />

        <div className="space-y-4">
          <SummaryStrip summary={summary} />
          <ResultsTable
            rows={rows}
            loading={loading}
            searched={searched}
            visibleKeys={visibleKeys}
          />
        </div>
      </div>
    </div>
  );
}