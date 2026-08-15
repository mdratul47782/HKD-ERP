// frontend/app/(Pages)/material-warehouse/material-stock/page.js

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Boxes, RotateCcw } from "lucide-react";

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
const label = "block mb-1 text-[11px] font-medium tracking-wide text-[#7a6250] dark:text-[#a8917d]";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";

const emptyFilters = {
  itemCodePdm: "", style: "", color: "", model: "", season: "",
  buyer: "", invoiceNo: "", item: "", warehouse: "", location: "",
};

function Field({ text, children }) {
  return (
    <label className="block text-xs">
      <span className={label}>{text}</span>
      {children}
    </label>
  );
}

/* ============================================================
   Summary cards -- Total Available Roll/Yds per Item Code/PDM + Color
   ============================================================ */

function SummaryStrip({ summary }) {
  if (!summary?.length) return null;
  return (
    <div className={`${card} p-3`}>
      <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc] mb-2">Total Available</h2>
      <div className="flex flex-wrap gap-2">
        {summary.map((s) => (
          <div
            key={`${s.itemCodePdm}-${s.color}`}
            className="rounded-lg border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 bg-white dark:bg-[#2a241b] px-3 py-2 min-w-[160px]"
          >
            <div className="text-[11px] font-medium text-[#8a4a24] dark:text-[#d4955e]">{s.itemCodePdm} · {s.color}</div>
            <div className="text-xs text-[#2c2417] dark:text-[#e8ddd0] mt-0.5">
              {s.totalAvailableRoll} Roll &middot; {s.totalAvailableYds} Yds
            </div>
          </div>
        ))}
      </div>
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
          <div>
            <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
              Material Stock <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Search</em>
            </h1>
            <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
              Search Available Stock (Location-assigned batches only). Results stay Date-wise and Batch-wise —
              same Item Code/PDM + Color at the same Location on different Receive Dates never merges into one row.
            </p>
          </div>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
          {/* FILTER FORM */}
          <form onSubmit={handleSubmit} className={`${card} p-3 space-y-3`}>
            <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc] pb-1 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
              Filters
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <Field text="Item Code/PDM"><input type="text" value={filters.itemCodePdm} onChange={(e) => setFilters({ ...filters, itemCodePdm: e.target.value })} className={inputCls} /></Field>
              <Field text="Style"><input type="text" value={filters.style} onChange={(e) => setFilters({ ...filters, style: e.target.value })} className={inputCls} /></Field>
              <Field text="Model"><input type="text" value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })} className={inputCls} /></Field>
              <Field text="Color"><input type="text" value={filters.color} onChange={(e) => setFilters({ ...filters, color: e.target.value })} className={inputCls} /></Field>
              <Field text="Season"><input type="text" value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value })} className={inputCls} /></Field>
              <Field text="Buyer"><input type="text" value={filters.buyer} onChange={(e) => setFilters({ ...filters, buyer: e.target.value })} className={inputCls} /></Field>
              <Field text="Invoice No."><input type="text" value={filters.invoiceNo} onChange={(e) => setFilters({ ...filters, invoiceNo: e.target.value })} className={inputCls} /></Field>
              <Field text="Item"><input type="text" value={filters.item} onChange={(e) => setFilters({ ...filters, item: e.target.value })} className={inputCls} /></Field>
              <Field text="Warehouse"><input type="text" value={filters.warehouse} onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })} className={inputCls} /></Field>
              <Field text="Location"><input type="text" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="flex flex-col gap-2 pt-1 border-t border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
              <button type="submit" disabled={loading} className={`${btnPrimary} w-full justify-center`}>
                {loading ? "Searching..." : "Search"}
              </button>
              <button type="button" onClick={handleReset} className={`${btnSecondary} w-full justify-center`}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </form>

          {/* RESULTS */}
          <div className="space-y-4">
            <SummaryStrip summary={summary} />
            <ResultsTable rows={rows} loading={loading} searched={searched} />
          </div>
        </div>
      </div>
    </div>
  );
}