// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-stock/page.js

"use client";

import { Boxes, Check, ChevronDown, ChevronUp, Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ============================================================
// Styles - Amber/Teal Theme (Improved)
// ============================================================

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-lg border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-3 py-2 text-sm text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-all";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-sm px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50 font-medium";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-sm px-3 py-2 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none font-medium";
const chip = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e] max-w-full truncate";

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

// ============================================================
// Column Definitions
// ============================================================

const ALL_STOCK_COLUMNS = [
  { key: "date", label: "Date", width: 6, defaultOn: true },
  { key: "invoiceNo", label: "Invoice No.", width: 7, defaultOn: false },
  { key: "buyer", label: "Buyer", width: 8, defaultOn: true },
  { key: "season", label: "Season", width: 6, defaultOn: false },
  { key: "styleModel", label: "Style / Model", width: 11, defaultOn: true },
  { key: "warehouse", label: "W/H", width: 5, defaultOn: false },
  { key: "item", label: "Item", width: 7, defaultOn: false },
  { key: "itemCodePdm", label: "Item Code/PDM", width: 9, defaultOn: true },
  { key: "color", label: "Color", width: 7, defaultOn: true },
  // NEW: Fabric Details + Supplier are searchable/displayable but start OFF so
  // the default table looks exactly like it did before this change -- the
  // user opts in to them via the Columns picker.
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
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">
          Total Available
          <span className="ml-2 text-sm font-sans text-[#a08060]">
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
          <div className="text-sm italic text-[#a08060] px-1 py-2">No matches.</div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-lg border border-[#2c2417]/8 dark:border-[#e8ddd0]/8">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gradient-to-r from-[#b87a4a] to-[#8a4a24] dark:from-[#6a4a2a] dark:to-[#4a3018] text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Item Code/PDM</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Color</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Avail. Roll</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Avail. Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={`${s.itemCodePdm}-${s.color}`}
                    className={`border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/10 transition-colors ${i % 2 === 0 ? "bg-white dark:bg-[#1a1208]" : "bg-[#b87a4a]/[0.04] dark:bg-[#d4955e]/[0.04]"
                      }`}
                  >
                    <td className="px-4 py-2 text-[#8a4a24] dark:text-[#d4955e] font-medium">{s.itemCodePdm}</td>
                    <td className="px-4 py-2 text-[#2c2417] dark:text-[#e8ddd0]">{s.color}</td>
                    <td className="px-4 py-2 text-right text-[#3d7a4a] dark:text-[#8fca9c] font-medium">
                      <span style={{ fontSize: numFontSize(s.totalAvailableRoll) }}>{formatNum(s.totalAvailableRoll)}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-[#3d7a4a] dark:text-[#8fca9c] font-medium">
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
// Filter Overlay Sidebar
// ============================================================

function FilterOverlay({ isOpen, onClose, filters, setFilters, onSearch, onReset, loading }) {
  const activeCount = Object.values(filters).filter((v) => v && v.trim()).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(e);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#f7f5f0] dark:bg-[#221d16] shadow-2xl z-50 overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-[#f7f5f0] dark:bg-[#221d16] border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#b87a4a]" />
            <h2 className="font-serif text-lg text-[#1a1208] dark:text-[#f0e8dc]">Filters</h2>
            {activeCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2417]/10 dark:hover:bg-[#e8ddd0]/10 transition-colors"
          >
            <X size={20} className="text-[#7a6250] dark:text-[#a8917d]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-3">
            {STOCK_FILTER_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs uppercase tracking-wide text-[#a08060] mb-1">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={filters[f.key]}
                  onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                  placeholder={f.label}
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
            <button type="submit" disabled={loading} className={`${btnPrimary} flex-1 justify-center`}>
              {loading ? "..." : "Search"}
            </button>
            <button type="button" onClick={handleReset} className={btnSecondary}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// ============================================================
// Column Overlay Sidebar
// ============================================================

function ColumnOverlay({ isOpen, onClose, visibleKeys, setVisibleKeys }) {
  const toggle = (key) =>
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectAll = () => setVisibleKeys(ALL_STOCK_COLUMNS.map((c) => c.key));
  const resetDefault = () => setVisibleKeys(DEFAULT_VISIBLE_KEYS);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#f7f5f0] dark:bg-[#221d16] shadow-2xl z-50 overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-[#f7f5f0] dark:bg-[#221d16] border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#3d8a7a] dark:text-[#6fd0b8]" />
            <h2 className="font-serif text-lg text-[#1a1208] dark:text-[#f0e8dc]">Columns</h2>
            <span className="text-sm text-[#a08060]">({visibleKeys.length} of {ALL_STOCK_COLUMNS.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2c2417]/10 dark:hover:bg-[#e8ddd0]/10 transition-colors"
          >
            <X size={20} className="text-[#7a6250] dark:text-[#a8917d]" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={selectAll} className={`${btnSecondary} flex-1 justify-center`}>
              Select All
            </button>
            <button type="button" onClick={resetDefault} className={`${btnSecondary} flex-1 justify-center`}>
              Reset
            </button>
          </div>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {ALL_STOCK_COLUMNS.map((c) => {
              const on = visibleKeys.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={`w-full flex items-center gap-3 rounded-lg border-[1.5px] px-3 py-2.5 text-sm transition-all ${on
                    ? "border-[#3d8a7a] dark:border-[#6fd0b8] bg-[#3d8a7a]/10 dark:bg-[#6fd0b8]/10 text-[#2c6a5a] dark:text-[#6fd0b8]"
                    : "border-[#2c2417]/15 dark:border-[#e8ddd0]/15 text-[#7a6250] dark:text-[#a8917d] hover:border-[#3d8a7a]/50"
                    }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${on
                    ? "bg-[#3d8a7a] dark:bg-[#6fd0b8] border-[#3d8a7a] dark:border-[#6fd0b8]"
                    : "border-[#2c2417]/25 dark:border-[#e8ddd0]/25"
                    }`}>
                    {on && <Check size={13} className="text-white dark:text-[#1b1712]" />}
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// ============================================================
// Table Components
// ============================================================

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
      <div className="truncate font-mono" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

function AvailCell({ value }) {
  const text = formatNum(value);
  return (
    <td className={`${CELL_PAD} text-right overflow-hidden text-[#3d7a4a] dark:text-[#8fca9c] font-semibold`}>
      <div className="truncate font-mono" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

function PercentCell({ percent, title }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <td className={`${CELL_PAD} overflow-hidden`}>
      <div className="flex items-center justify-center gap-1.5" title={title}>
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
            className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-[#3d8a7a] dark:text-[#6fd0b8] hover:underline"
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

function renderStockCell(colKey, r, rollPct, ydsPct) {
  switch (colKey) {
    case "date": return <Cell key="date" title={r.date?.slice(0, 10)}>{r.date?.slice(0, 10)}</Cell>;
    case "invoiceNo": return <Cell key="invoiceNo" title={r.invoiceNo}>{r.invoiceNo}</Cell>;
    case "buyer": return <Cell key="buyer" title={r.buyer}>{r.buyer}</Cell>;
    case "season": return <Cell key="season" title={r.season}>{r.season}</Cell>;
    case "styleModel": return <StyleModelCell key="styleModel" styles={r.styles} />;
    case "warehouse": return <Cell key="warehouse" title={r.warehouse}><span className={chip}>{r.warehouse}</span></Cell>;
    case "item": return <Cell key="item" title={r.item}>{r.item}</Cell>;
    case "itemCodePdm": return <Cell key="itemCodePdm" title={r.itemCodePdm} className="text-[#8a4a24] dark:text-[#d4955e] font-medium">{r.itemCodePdm}</Cell>;
    case "color": return <Cell key="color" title={r.color}>{r.color}</Cell>;
    case "fabricDetails": return <Cell key="fabricDetails" title={r.fabricDetails}>{r.fabricDetails || <span className="italic text-[#a08060]">-</span>}</Cell>;
    case "supplier": return <Cell key="supplier" title={r.supplier}>{r.supplier || <span className="italic text-[#a08060]">-</span>}</Cell>;
    case "location": return <Cell key="location" title={r.location}><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3d8a7a]/12 text-[#2c6a5a] dark:bg-[#6fd0b8]/15 dark:text-[#6fd0b8]">{r.location}</span></Cell>;
    case "receivedRoll": return <NumCell key="receivedRoll" value={r.rollQty} />;
    case "receivedYds": return <NumCell key="receivedYds" value={r.yds} />;
    case "availableRoll": return <AvailCell key="availableRoll" value={r.availableRoll} />;
    case "rollChart": return <PercentCell key="rollChart" percent={rollPct} title={`${rollPct}% of received roll still available`} />;
    case "availableYds": return <AvailCell key="availableYds" value={r.availableYds} />;
    case "ydsChart": return <PercentCell key="ydsChart" percent={ydsPct} title={`${ydsPct}% of received yds still available`} />;
    default: return null;
  }
}

// ============================================================
// Results Table - Improved Amber/Teal Theme
// ============================================================

function ResultsTable({ rows, loading, searched, visibleKeys, onOpenFilters }) {
  const columns = useMemo(
    () => ALL_STOCK_COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys]
  );
  const totalWidth = columns.reduce((s, c) => s + c.width, 0) || 1;

  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 bg-gradient-to-r from-[#b87a4a]/10 via-[#b87a4a]/5 to-[#3d8a7a]/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#b87a4a]/10 dark:bg-[#d4955e]/10">
            <Boxes size={18} className="text-[#b87a4a] dark:text-[#d4955e]" />
          </div>
          <h2 className="font-serif text-lg text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
          <span className="text-sm text-[#a08060] bg-[#2c2417]/5 dark:bg-[#e8ddd0]/5 px-2.5 py-0.5 rounded-full">
            {rows.length}
          </span>
        </div>
        <button onClick={onOpenFilters} className={btnSecondary}>
          <Filter size={14} /> Filters
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden max-h-[65vh]"
        style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
      >
        {loading ? (
          <div className="text-center py-12 text-[#a08060] text-sm">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#b87a4a] border-t-transparent mb-2"></div>
            <div>Loading...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-[#a08060] text-sm px-4">
            {searched ? "No stock batches match these filters." : "Click Filters to search for stock."}
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-12 text-[#a08060] text-sm px-4">
            No columns selected — use Columns picker.
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed" style={TABLE_FONT_STYLE}>
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={{ width: `${(c.width / totalWidth) * 100}%` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-[#b87a4a] via-[#a8703f] to-[#3d8a7a] dark:from-[#6a4a2a] dark:via-[#5a4020] dark:to-[#2c6a5a]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${CELL_PAD} overflow-hidden font-semibold text-white/95 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                      }`}
                  >
                    <div className="truncate text-[0.9em] tracking-wide" title={c.label}>{c.label}</div>
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
                    className={`border-t border-[#2c2417]/6 dark:border-[#e8ddd0]/6 transition-all duration-150 ${i % 2 === 0
                      ? "bg-white dark:bg-[#1a1208] hover:bg-[#b87a4a]/[0.06] dark:hover:bg-[#d4955e]/[0.06]"
                      : "bg-[#b87a4a]/[0.03] dark:bg-[#d4955e]/[0.03] hover:bg-[#b87a4a]/[0.08] dark:hover:bg-[#d4955e]/[0.08]"
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
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #c4b5a5;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a8907d;
        }
        .dark ::-webkit-scrollbar-thumb {
          background: #5a4a3a;
        }
        .dark ::-webkit-scrollbar-thumb:hover {
          background: #6a5a4a;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);

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
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#b87a4a] to-[#8a4a24] dark:from-[#6a4a2a] dark:to-[#4a3018] text-white shadow-lg">
              <Search size={20} />
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
                Material Stock
              </h1>
              <p className="text-sm text-[#a08060]">Search and manage inventory</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(true)}
              className={btnSecondary}
            >
              <Filter size={16} /> Filters
            </button>
            <button
              onClick={() => setIsColumnOpen(true)}
              className={btnSecondary}
            >
              <SlidersHorizontal size={16} /> Columns
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-sm px-4 py-3">
            <b>Error:</b> {error}
          </div>
        )}

        <FilterOverlay
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          setFilters={setFilters}
          onSearch={handleSubmit}
          onReset={handleReset}
          loading={loading}
        />

        <ColumnOverlay
          isOpen={isColumnOpen}
          onClose={() => setIsColumnOpen(false)}
          visibleKeys={visibleKeys}
          setVisibleKeys={setVisibleKeys}
        />

        <div className="space-y-4">
          <SummaryStrip summary={summary} />
          <ResultsTable
            rows={rows}
            loading={loading}
            searched={searched}
            visibleKeys={visibleKeys}
            onOpenFilters={() => setIsFilterOpen(true)}
          />
        </div>
      </div>
    </div>
  );
}