// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-stock/page.js


"use client";

import { Boxes, ChevronDown, ChevronUp, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens (same warm HKD theme as Material Receive)
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

// One clearly-labeled field per filter. Rendered in a responsive grid
// (wraps to more rows on narrow screens) instead of a fixed-width
// horizontally-scrolling line, so nothing needs to be scrolled to reach.
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
   Number helpers -- shared by SummaryStrip and ResultsTable.

   formatNum:  "3026.00" -> "3026", "12.50" -> "12.5", plus
   thousands separators, so numbers stay as short as possible
   before we even think about shrinking the font.

   numFontSize: the longer the formatted number ends up being,
   the smaller its font -- so a narrow column never has to
   truncate/ellipsis a value, it just shrinks to fit instead.
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
   Summary table -- Total Available Roll/Yds per Item Code/PDM +
   Color, rendered as a real table (not cards) so it stays compact
   and readable even with lots of combinations. Aggregates across
   ALL invoices for that Item Code/PDM + Color combination (that's
   the whole point of "Total Available"), so there's no single
   Invoice No. shown here -- it's a total, not a per-invoice batch.
   Per-invoice, date-wise batches are in the table below.

   Adds:
   - A Hide/Show toggle so the whole block can be collapsed out of
     the way once you've seen it.
   - Its own search box (Item Code/PDM or Color) that filters the
     summary rows client-side, independent of the main Filters bar
     above -- handy for a quick "what's the total for X" lookup
     without re-running the full batch search.
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
              <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left">Item Code/PDM</th>
                  <th className="px-3 py-2 text-left">Color</th>
                  <th className="px-3 py-2 text-right">Available Roll</th>
                  <th className="px-3 py-2 text-right">Available Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const rollText = formatNum(s.totalAvailableRoll);
                  const ydsText = formatNum(s.totalAvailableYds);
                  return (
                    <tr
                      key={`${s.itemCodePdm}-${s.color}`}
                      className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5"
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
   Filter Bar -- collapsed ("Hide") by default so it stays out of
   the way. Tap "Show Filters" to drop it open, fill in whatever's
   needed, then Search. It auto-collapses back after a search so the
   results have room, but can always be reopened.
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
   Mini donut/pie chart -- shows Available as a % slice of Received,
   so "Available Roll" / "Available Yds" aren't just bare numbers,
   there's a quick visual read of how much stock is left too.
   Rendered at 100% of its wrapper (see ResultsTable), which is
   itself sized with clamp(), so the whole chart shrinks along with
   everything else on small screens.
   ============================================================ */

function MiniDonut({ percent, size = 30, strokeWidth = 5 }) {
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
        className="stroke-[#3d7a4a] dark:stroke-[#8fca9c] transition-[stroke-dashoffset] duration-300"
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="fill-[#2c2417] dark:fill-[#e8ddd0]"
        style={{ fontSize: size * 0.32 }}
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}

/* ============================================================
   Results table -- Date-wise, Batch-wise, Location-wise

   FIX #1 (layout): fixed-layout table (`table-fixed`, `w-full`,
   `<colgroup>` with % widths) so it never exceeds its container's
   width -- no horizontal scrollbar on any screen size. Font-size
   and padding scale with `clamp()`.

   FIX #2 (long numbers): Received/Available Roll & Yds go through
   `formatNum()` (drops pointless ".00", adds thousands separators)
   and are sized with `numFontSize()` so long values shrink to fit
   instead of getting clipped.

   FIX #3 (no bold): all font-bold / font-semibold / font-extrabold
   weight classes removed -- every cell renders at normal weight.

   All columns are always shown (no hide/collapse toggle) -- widths
   are percentages that sum to 100%, so the full set always fits
   the container width, scaling down with `clamp()` on narrow
   screens instead of being hidden.

   Every cell's content sits in a `truncate` wrapper (single line,
   ellipsis, no wrap) with a `title` attribute holding the full
   value. Only VERTICAL scrolling remains, for many rows. The one
   exception is Style/Model (see `StyleModelCell` below), which can
   hold several chips and collapses those behind its own "+N more"
   toggle instead of truncating.
   ============================================================ */

// Percentages sum to 100 so the fixed-layout table always exactly
// fills its container width, on any screen size.
const STOCK_COLUMNS = [
  { key: "date", label: "Date", width: 7 },
  { key: "invoiceNo", label: "Invoice No.", width: 8 },
  { key: "buyer", label: "Buyer", width: 8 },
  { key: "season", label: "Season", width: 6 },
  { key: "styleModel", label: "Style / Model", width: 10 },
  { key: "warehouse", label: "W/H", width: 5 },
  { key: "itemCodePdm", label: "Item Code/PDM", width: 8 },
  { key: "color", label: "Color", width: 7 },
  { key: "location", label: "Location", width: 6 },
  { key: "receivedRoll", label: "Recv. Roll", width: 6, align: "right" },
  { key: "receivedYds", label: "Recv. Yds", width: 6, align: "right" },
  { key: "availableRoll", label: "Avail. Roll", width: 6, align: "right" },
  { key: "rollChart", label: "Roll %", width: 5, align: "center" },
  { key: "availableYds", label: "Avail. Yds", width: 6, align: "right" },
  { key: "ydsChart", label: "Yds %", width: 6, align: "center" },
];

// Scales from ~11px on a very small phone up to ~14px on a normal
// desktop viewport. Every font size inside the table is written in
// `em` (or set explicitly for numbers, see numFontSize) so it rides
// along with this one value.
const TABLE_FONT_STYLE = { fontSize: "clamp(0.6rem, 0.45rem + 0.55vw, 0.875rem)" };
const CELL_PAD = "px-[clamp(2px,0.5vw,10px)] py-[clamp(3px,0.45vw,8px)]";
const DONUT_BOX = { width: "clamp(16px, 2.4vw, 30px)", height: "clamp(16px, 2.4vw, 30px)" };

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

// Received Roll / Received Yds -- plain dark number, normal weight.
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

// Available Roll / Available Yds -- green-tinted number, normal weight.
function AvailCell({ value }) {
  const text = formatNum(value);
  return (
    <td className={`${CELL_PAD} text-right overflow-hidden text-[#3d7a4a] dark:text-[#8fca9c]`}>
      <div className="truncate" style={{ fontSize: numFontSize(text) }} title={text}>
        {text}
      </div>
    </td>
  );
}

// Style / Model -- a row can carry several style/model pairs
// (e.g. "349264 / 9249", "8827800349249 / 8872167", ...). Showing
// all of them at once either overflows the cell or forces the row
// very tall. Instead: show just the first pair by default, plus a
// small "+N more" toggle underneath -- click it to drop down and
// reveal the rest (and "Show less" to collapse back). Each row
// tracks its own expanded state independently.
function StyleModelCell({ styles }) {
  const [expanded, setExpanded] = useState(false);
  const list = styles || [];
  const visible = expanded ? list : list.slice(0, 1);
  const hiddenCount = list.length - visible.length;
  const fullText = list.map((s) => `${s.style}${s.model ? ` / ${s.model}` : ""}`).join(", ");

  return (
    <td className={`${CELL_PAD} overflow-hidden align-top`}>
      <div title={fullText}>
        <div className="flex flex-wrap gap-0.5">
          {visible.map((s) => (
            <span key={s.id ?? `${s.style}-${s.model ?? ""}`} className={chip}>
              {s.style}{s.model ? ` / ${s.model}` : ""}
            </span>
          ))}
        </div>
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-0.5 inline-flex items-center gap-0.5 text-[0.75em] text-[#b87a4a] dark:text-[#d4955e] hover:underline"
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

// Renders one row's <td> for a given column key. Pulled out of the
// row-map loop so both the compact and expanded views can reuse it
// against whichever column subset is currently visible.
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
    case "itemCodePdm":
      return (
        <Cell key="itemCodePdm" title={r.itemCodePdm} className="text-[#8a4a24] dark:text-[#d4955e]">
          {r.itemCodePdm}
        </Cell>
      );
    case "color":
      return <Cell key="color" title={r.color}>{r.color}</Cell>;
    case "location":
      return (
        <Cell key="location" title={r.location}>
          <span className={chip}>{r.location}</span>
        </Cell>
      );
    case "receivedRoll":
      return <NumCell key="receivedRoll" value={r.rollQty} />;
    case "receivedYds":
      return <NumCell key="receivedYds" value={r.yds} />;
    case "availableRoll":
      return <AvailCell key="availableRoll" value={r.availableRoll} />;
    case "rollChart":
      return (
        <Cell key="rollChart" align="center" title={`${rollPct}% of received roll still available`}>
          <div style={DONUT_BOX}>
            <MiniDonut percent={rollPct} />
          </div>
        </Cell>
      );
    case "availableYds":
      return <AvailCell key="availableYds" value={r.availableYds} />;
    case "ydsChart":
      return (
        <Cell key="ydsChart" align="center" title={`${ydsPct}% of received yds still available`}>
          <div style={DONUT_BOX}>
            <MiniDonut percent={ydsPct} />
          </div>
        </Cell>
      );
    default:
      return null;
  }
}

function ResultsTable({ rows, loading, searched }) {
  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
        <Boxes size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-lg text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
        <span className="text-sm text-[#a08060]">({rows.length})</span>
      </div>

      {/* Only vertical scroll -- horizontal is intentionally
         disabled because the fixed-layout table's % widths always
         sum to 100%, so every column always fits the container. */}
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
        ) : (
          <table className="w-full border-collapse table-fixed" style={TABLE_FONT_STYLE}>
            <colgroup>
              {STOCK_COLUMNS.map((c) => (
                <col key={c.key} style={{ width: `${c.width}%` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
              <tr>
                {STOCK_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={`${CELL_PAD} overflow-hidden ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                  >
                    <div className="truncate" title={c.label}>{c.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rollPct = r.rollQty ? Math.round((r.availableRoll / r.rollQty) * 100) : 0;
                const ydsPct = r.yds ? Math.round((r.availableYds / r.yds) * 100) : 0;
                return (
                  <tr key={r.itemId} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                    {STOCK_COLUMNS.map((c) => renderStockCell(c.key, r, rollPct, ydsPct))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Hides the scrollbar visually (WebKit) while the container
         above stays scrollable -- Firefox/IE are handled inline via
         scrollbarWidth/msOverflowStyle. */}
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

        {/* Filter bar -- collapsed by default; tap "Show Filters" to
           expand it downward, fill it in, and search. */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          loading={loading}
          onSearch={handleSubmit}
          onReset={handleReset}
        />

        {/* Summary and Results */}
        <div className="space-y-4">
          <SummaryStrip summary={summary} />
          <ResultsTable rows={rows} loading={loading} searched={searched} />
        </div>
      </div>
    </div>
  );
}