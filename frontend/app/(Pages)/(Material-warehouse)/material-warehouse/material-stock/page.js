// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-stock/page.js


"use client";

import { Boxes, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens (same warm HKD theme as Material Receive)
   ============================================================ */

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-xs text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-colors";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-xs font-medium px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-xs font-medium px-3 py-1.5 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";

const emptyFilters = {
  itemCodePdm: "", style: "", color: "", model: "", season: "",
  buyer: "", invoiceNo: "", item: "", warehouse: "", location: "",
};

// One clearly-labeled field per filter, all rendered on a single
// horizontally-scrollable line (no click-to-open/close anymore).
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
        <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">
          Total Available{" "}
          <span className="text-[11px] font-sans font-normal text-[#a08060]">
            (across all invoices, by Item Code/PDM + Color)
          </span>
          <span className="ml-2 text-[11px] font-sans font-normal text-[#a08060]">
            ({filtered.length}{q ? ` of ${summary.length}` : ""})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {!hidden && (
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a08060]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Item Code/PDM or Color..."
                className={`${inputCls} !py-1 !pl-6 text-[11px] w-64`}
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
          <div className="text-[11px] italic text-[#a08060] px-1 py-2">No matches.</div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-lg border border-[#2c2417]/8 dark:border-[#e8ddd0]/8">
            <table className="min-w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item Code/PDM</th>
                  <th className="px-3 py-2 text-left font-semibold">Color</th>
                  <th className="px-3 py-2 text-right font-semibold">Available Roll</th>
                  <th className="px-3 py-2 text-right font-semibold">Available Yds</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={`${s.itemCodePdm}-${s.color}`}
                    className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5"
                  >
                    <td className="px-3 py-2 font-semibold text-[#8a4a24] dark:text-[#d4955e] whitespace-nowrap">
                      {s.itemCodePdm}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.color}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-[#3d7a4a] dark:text-[#8fca9c]">
                      {s.totalAvailableRoll}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-[#3d7a4a] dark:text-[#8fca9c]">
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
   Filter Bar -- always visible (no click-to-expand), every field
   on one scrollable line with its own small label above it.
   ============================================================ */

function FilterBar({ filters, setFilters, loading, onSearch, onReset }) {
  const activeCount = Object.values(filters).filter((v) => v && v.trim()).length;

  return (
    <div className={`${card} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Search size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">Filters</h2>
        {activeCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]">
            {activeCount} active
          </span>
        )}
      </div>

      <form onSubmit={onSearch}>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {STOCK_FILTER_FIELDS.map((f) => (
            <label key={f.key} className="shrink-0 w-[132px]">
              <span className="block mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#a08060] whitespace-nowrap">
                {f.label}
              </span>
              <input
                type="text"
                value={filters[f.key]}
                onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                placeholder={f.label}
                className={`${inputCls} text-[11px] py-1`}
              />
            </label>
          ))}

          <div className="shrink-0 flex gap-1.5 pb-[1px]">
            <button type="submit" disabled={loading} className={`${btnPrimary} px-4 whitespace-nowrap`}>
              {loading ? "..." : "Search"}
            </button>
            <button type="button" onClick={onReset} className={`${btnSecondary} whitespace-nowrap`}>
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </form>
    </div>
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
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
        <span className="text-[11px] text-[#a08060]">({rows.length})</span>
      </div>

      <div className="flex-1 overflow-auto max-h-[65vh]">
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-xs">
            {searched ? "No stock batches match these filters." : "Enter filters and search, or search with everything blank to see all available stock."}
          </div>
        ) : (
          <table className="min-w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Invoice No.</th>
                <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold">Season</th>
                <th className="px-3 py-2 text-left font-semibold">Style / Model</th>
                <th className="px-3 py-2 text-left font-semibold">W/H</th>
                <th className="px-3 py-2 text-left font-semibold">Item Code/PDM</th>
                <th className="px-3 py-2 text-left font-semibold">Color</th>
                <th className="px-3 py-2 text-left font-semibold">Location</th>
                <th className="px-3 py-2 text-left font-semibold">Received Roll/Yds</th>
                <th className="px-3 py-2 text-left font-semibold">Available Roll/Yds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                  <td className="px-3 py-2 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-medium text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.invoiceNo}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.buyer}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.season}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(r.styles || []).map((s) => (
                        <span key={s.id ?? s.style} className={chip}>{s.style}{s.model ? ` · ${s.model}` : ""}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className={chip}>{r.warehouse}</span></td>
                  <td className="px-3 py-2 text-[#8a4a24] dark:text-[#d4955e] font-medium whitespace-nowrap">{r.itemCodePdm}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.color}</td>
                  <td className="px-3 py-2 whitespace-nowrap"><span className={chip}>{r.location}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.rollQty} / {r.yds}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-[#3d7a4a] dark:text-[#8fca9c]">{r.availableRoll} / {r.availableYds}</td>
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
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <Search size={22} className="text-[#b87a4a]" />
          <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
            Material Stock <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Search</em>
          </h1>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}

        {/* Always-visible, single-line filter bar */}
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