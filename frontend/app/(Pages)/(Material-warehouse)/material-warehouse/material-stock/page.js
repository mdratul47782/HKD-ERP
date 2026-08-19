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
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-sm font-semibold px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-sm font-semibold px-3 py-1.5 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";

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
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc] font-bold">
          Total Available{" "}
          <span className="text-xs font-sans font-semibold text-[#a08060]">
            (across all invoices, by Item Code/PDM + Color)
          </span>
          <span className="ml-2 text-xs font-sans font-semibold text-[#a08060]">
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
          <div className="text-sm font-semibold italic text-[#a08060] px-1 py-2">No matches.</div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-lg border border-[#2c2417]/8 dark:border-[#e8ddd0]/8">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Item Code/PDM</th>
                  <th className="px-3 py-2 text-left font-bold">Color</th>
                  <th className="px-3 py-2 text-right font-bold">Available Roll</th>
                  <th className="px-3 py-2 text-right font-bold">Available Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={`${s.itemCodePdm}-${s.color}`}
                    className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5"
                  >
                    <td className="px-3 py-2 font-bold text-[#8a4a24] dark:text-[#d4955e] whitespace-nowrap">
                      {s.itemCodePdm}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{s.color}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold text-[#3d7a4a] dark:text-[#8fca9c]">
                      {s.totalAvailableRoll}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold text-[#3d7a4a] dark:text-[#8fca9c]">
                      {s.totalAvailableYds}
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
          <h2 className="font-serif text-base font-bold text-[#1a1208] dark:text-[#f0e8dc]">Filters</h2>
          {activeCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]">
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
                <span className="block mb-0.5 text-[11px] font-bold uppercase tracking-wide text-[#a08060] whitespace-nowrap">
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
   styled like a rack-capacity gauge ring: big, thick stroke, bold %
   in the middle, and colored green/amber/red by how much stock is
   left, so it's a quick visual read, not just a bare number.
   ============================================================ */

function donutColorClass(percent) {
  if (percent >= 60) return "stroke-[#3d7a4a] dark:stroke-[#8fca9c]"; // healthy
  if (percent >= 30) return "stroke-[#b87a4a] dark:stroke-[#d4955e]"; // watch
  return "stroke-[#b8433a] dark:stroke-[#e08a80]"; // low
}

function MiniDonut({ percent, size = 60, strokeWidth = 9 }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
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
        className={`${donutColorClass(clamped)} transition-[stroke-dashoffset] duration-300`}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="fill-[#1a1208] dark:fill-[#f0e8dc]"
        style={{ fontSize: size * 0.3, fontWeight: 800 }}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

/* ============================================================
   Results table -- Date-wise, Batch-wise, Location-wise
   ============================================================ */

function ResultsTable({ rows, loading, searched }) {
  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
        <Boxes size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-lg font-bold text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
        <span className="text-sm font-semibold text-[#a08060]">({rows.length})</span>
      </div>

      {/* This table genuinely needs its own horizontal scroll on small
         screens (10 columns of tabular data) -- that's normal table
         behavior, distinct from the filter fields above which no
         longer require any scrolling. */}
      <div className="flex-1 overflow-auto max-h-[65vh]">
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-sm font-semibold">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-sm font-semibold px-4">
            {searched ? "No stock batches match these filters." : "Enter filters and search, or search with everything blank to see all available stock."}
          </div>
        ) : (
          <table className="min-w-[1340px] w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Date</th>
                <th className="px-3 py-2 text-left font-bold">Invoice No.</th>
                <th className="px-3 py-2 text-left font-bold">Buyer</th>
                <th className="px-3 py-2 text-left font-bold">Season</th>
                <th className="px-3 py-2 text-left font-bold">Style / Model</th>
                <th className="px-3 py-2 text-left font-bold">W/H</th>
                <th className="px-3 py-2 text-left font-bold">Item Code/PDM</th>
                <th className="px-3 py-2 text-left font-bold">Color</th>
                <th className="px-3 py-2 text-left font-bold">Location</th>
                <th className="px-3 py-2 text-right font-bold">Received Roll</th>
                <th className="px-3 py-2 text-right font-bold">Received Yds</th>
                <th className="px-3 py-2 text-right font-bold">Available Roll</th>
                <th className="px-3 py-2 text-center font-bold">Roll Chart</th>
                <th className="px-3 py-2 text-right font-bold">Available Yds</th>
                <th className="px-3 py-2 text-center font-bold">Yds Chart</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-bold text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.invoiceNo}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.buyer}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.season}</td>
                  {/* Style and Model are combined into a single chip per entry
                     (instead of two separate flex-wrap lists in two columns).
                     Previously, when an entry had no model, that column's chip
                     was skipped entirely -- shifting the chip indices between
                     the two lists out of sync, so a style could visually line
                     up with the wrong model. Pairing them in one chip makes
                     that misalignment impossible. */}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(r.styles || []).map((s) => (
                        <span key={s.id ?? `${s.style}-${s.model ?? ""}`} className={chip}>
                          {s.style}{s.model ? ` / ${s.model}` : ""}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className={chip}>{r.warehouse}</span></td>
                  <td className="px-3 py-2 text-[#8a4a24] dark:text-[#d4955e] font-bold whitespace-nowrap">{r.itemCodePdm}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.color}</td>
                  <td className="px-3 py-2 whitespace-nowrap"><span className={chip}>{r.location}</span></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold">{r.rollQty}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold">{r.yds}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold text-[#3d7a4a] dark:text-[#8fca9c]">{r.availableRoll}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center" title={`${r.rollQty ? Math.round((r.availableRoll / r.rollQty) * 100) : 0}% of received roll still available`}>
                      <MiniDonut percent={r.rollQty ? (r.availableRoll / r.rollQty) * 100 : 0} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-base font-extrabold text-[#3d7a4a] dark:text-[#8fca9c]">{r.availableYds}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center" title={`${r.yds ? Math.round((r.availableYds / r.yds) * 100) : 0}% of received yds still available`}>
                      <MiniDonut percent={r.yds ? (r.availableYds / r.yds) * 100 : 0} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1a1208] dark:text-[#f0e8dc]">
            Material Stock <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Search</em>
          </h1>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-sm font-semibold px-3 py-2"><b>Error:</b> {error}</div>}

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