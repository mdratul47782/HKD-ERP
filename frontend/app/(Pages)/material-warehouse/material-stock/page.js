// frontend/app/(Pages)/material-warehouse/material-stock/page.js

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Boxes, X, RotateCcw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens (warm HKD theme, Tailwind-only)
   ============================================================ */

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-xs text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-colors";
const label = "block mb-1 text-[11px] font-medium tracking-wide text-[#7a6250] dark:text-[#a8917d]";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-xs font-medium px-3 py-1.5 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none";

const EMPTY_FILTERS = {
  itemCodePdm: "", style: "", color: "", model: "", season: "",
  buyer: "", invoiceNo: "", item: "", warehouse: "", location: "",
};

const SEARCH_FIELDS = [
  { key: "itemCodePdm", text: "Item Code / PDM" },
  { key: "style", text: "Style" },
  { key: "color", text: "Color" },
  { key: "model", text: "Model" },
  { key: "season", text: "Season" },
  { key: "buyer", text: "Buyer" },
  { key: "invoiceNo", text: "Invoice No." },
  { key: "item", text: "Item" },
  { key: "warehouse", text: "W/H" },
  { key: "location", text: "Location" },
];

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

function SearchField({ field, value, onChange }) {
  return (
    <div>
      <label className={label}>{field.text}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.text}
        className={inputCls}
      />
    </div>
  );
}

export default function MaterialStockPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState({ rows: [], summary: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const fetchStock = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(f)) if (v && v.trim()) params.set(k, v.trim());
      const url = `${API_URL}/material-stock${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load material stock");
      setData(await res.json());
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStock(EMPTY_FILTERS); }, [fetchStock]);
  useEffect(() => {
    const t = setTimeout(() => fetchStock(filters), 400);
    return () => clearTimeout(t);
  }, [filters, fetchStock]);

  const setFilter = (key, v) => setFilters((p) => ({ ...p, [key]: v }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const activeFilterCount = Object.values(filters).filter((v) => v && v.trim()).length;

  const { rows, summary } = data;

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <Boxes size={22} className="text-[#b87a4a]" />
          <div>
            <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
              Material <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Stock / Search</em>
            </h1>
            <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
              Only approved batches (location assigned) appear here. Every row is one Receive Date + Item Code/PDM +
              Color + Location batch — they are never merged, and results are ordered oldest Receive Date first so
              FIFO issuing is straightforward later.
            </p>
          </div>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}

        {/* SEARCH PANEL */}
        <div className={`${card} p-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 mb-2">
            <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">Search Filters</h2>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className={chip}>{activeFilterCount} active</span>
              )}
              <button type="button" onClick={resetFilters} className={`${btnSecondary} px-2.5 py-1`}>
                <RotateCcw size={11} /> Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-2">
            {SEARCH_FIELDS.map((f) => (
              <SearchField key={f.key} field={f} value={filters[f.key]} onChange={setFilter} />
            ))}
          </div>
        </div>

        {/* TOTAL AVAILABLE SUMMARY */}
        <div className={`${card} p-3`}>
          <div className="flex items-center gap-2 pb-2 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 mb-2">
            <Search size={14} className="text-[#b87a4a]" />
            <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">Total Available Roll / Yds</h2>
            <span className="text-[11px] text-[#a08060]">(per Item Code/PDM + Color, across all batches)</span>
          </div>
          {loading ? (
            <div className="text-center py-4 text-[#a08060] text-xs">Loading...</div>
          ) : summary.length === 0 ? (
            <div className="text-center py-4 text-[#a08060] text-xs">
              No approved stock matches{searched && activeFilterCount > 0 ? " the current filters" : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-[#7a6250] dark:text-[#a8917d]">
                    <th className="px-3 py-1.5 text-left font-medium">Item Code / PDM</th>
                    <th className="px-3 py-1.5 text-left font-medium">Color</th>
                    <th className="px-3 py-1.5 text-right font-medium">Total Available Roll</th>
                    <th className="px-3 py-1.5 text-right font-medium">Total Available Yds</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={`${s.itemCodePdm}-${s.color}`} className="border-t border-[#2c2417]/5 dark:border-[#e8ddd0]/5">
                      <td className="px-3 py-1.5 font-medium text-[#8a4a24] dark:text-[#d4955e]">{s.itemCodePdm}</td>
                      <td className="px-3 py-1.5">{s.color}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-[#1a1208] dark:text-[#f0e8dc]">{s.totalAvailableRoll}</td>
                      <td className="px-3 py-1.5 text-right">{Number(s.totalAvailableYds).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BATCH-WISE DETAIL */}
        <div className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
            <Boxes size={16} className="text-[#b87a4a]" />
            <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Stock Batches</h2>
            <span className="text-[11px] text-[#a08060]">({rows.length}) — Date-wise · Batch-wise · Location-wise</span>
          </div>

          <div className="flex-1 overflow-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-[#a08060] text-xs">
                No batches found. Assign locations on the Location Assignment page to make stock available.
              </div>
            ) : (
              <table className="min-w-full text-[11px] border-collapse">
                <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Receive Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Item Code / PDM</th>
                    <th className="px-3 py-2 text-left font-semibold">Style</th>
                    <th className="px-3 py-2 text-left font-semibold">Model</th>
                    <th className="px-3 py-2 text-left font-semibold">Color</th>
                    <th className="px-3 py-2 text-left font-semibold">Location</th>
                    <th className="px-3 py-2 text-left font-semibold">W/H</th>
                    <th className="px-3 py-2 text-right font-semibold">Roll</th>
                    <th className="px-3 py-2 text-right font-semibold">Yds</th>
                    <th className="px-3 py-2 text-right font-semibold">Avail. Roll</th>
                    <th className="px-3 py-2 text-right font-semibold">Avail. Yds</th>
                    <th className="px-3 py-2 text-left font-semibold">Invoice No.</th>
                    <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                    <th className="px-3 py-2 text-left font-semibold">Season</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.itemId} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-[#1a1208] dark:text-[#f0e8dc]">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 font-medium text-[#8a4a24] dark:text-[#d4955e] whitespace-nowrap">{r.itemCodePdm}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{(r.styles || []).map((s) => s.style).join(", ") || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{(r.styles || []).map((s) => s.model).filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.color}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={chip}>{r.location}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.warehouse}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{r.rollQty}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{Number(r.yds).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.availableRoll}</td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{Number(r.availableYds).toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.invoiceNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.buyer}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.season}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
