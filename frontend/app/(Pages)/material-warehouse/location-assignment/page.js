// frontend/app/(Pages)/material-warehouse/location-assignment/page.js

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, MapPin, CheckCircle2, PackageCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens (warm HKD theme, Tailwind-only)
   ============================================================ */

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-xs text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-colors";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-xs font-medium px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";
const chipPending = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b8933a]/15 text-[#8a6a1a] dark:bg-[#e0c068]/15 dark:text-[#e0c068]";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");

export default function LocationAssignmentPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [drafts, setDrafts] = useState({}); // { itemId: locationText }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchPending = useCallback(async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const url = term
        ? `${API_URL}/location-assignment?search=${encodeURIComponent(term)}`
        : `${API_URL}/location-assignment`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load pending assignments");
      const data = await res.json();
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { const t = setTimeout(() => fetchPending(search), 400); return () => clearTimeout(t); }, [search, fetchPending]);

  const handleAssign = async (itemId) => {
    const location = (drafts[itemId] || "").trim();
    if (!location) { setError("Enter a Location/Rack first."); return; }
    setAssigningId(itemId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/location-assignment/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to assign location"); }
      const updated = await res.json();
      setSuccess(`Batch ${updated.itemCodePdm} / ${updated.color} approved at ${updated.location}.`);
      setDrafts((p) => { const n = { ...p }; delete n[itemId]; return n; });
      fetchPending(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status !== "approved").length || rows.length;

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <MapPin size={22} className="text-[#b87a4a]" />
          <div>
            <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
              Location <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Assignment</em>
            </h1>
            <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
              Approve each received batch by assigning its Location/Rack. Once a batch is assigned it becomes
              available stock — batches stay separate by Receive Date, so the same Item Code/PDM + Color can live
              in multiple Racks or arrive on different dates without ever being merged.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={chipPending}>Pending batches: {pendingCount}</span>
          <span className={chip}>Oldest Receive Date listed first (FIFO order)</span>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}
        {success && <div className="rounded-lg bg-[#5ca068]/10 border border-[#5ca068]/25 text-[#3d7a4a] dark:text-[#8fca9c] text-xs px-3 py-2"><CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />{success}</div>}

        <div className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
            <PackageCheck size={16} className="text-[#b87a4a]" />
            <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Awaiting Location</h2>
            <span className="text-[11px] text-[#a08060]">({rows.length})</span>
          </div>

          <div className="px-4 py-2.5 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a08060]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item code/PDM, color, invoice, buyer, PO, item..."
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[72vh]">
            {loading ? (
              <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-[#a08060] text-xs">
                No pending batches. New Material Receives appear here once saved.
              </div>
            ) : (
              <table className="min-w-full text-[11px] border-collapse">
                <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Invoice No.</th>
                    <th className="px-3 py-2 text-left font-semibold">Style / Model</th>
                    <th className="px-3 py-2 text-left font-semibold">Item Code / PDM</th>
                    <th className="px-3 py-2 text-left font-semibold">Color</th>
                    <th className="px-3 py-2 text-left font-semibold">Roll</th>
                    <th className="px-3 py-2 text-left font-semibold">Yds</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold w-56">Location / Rack</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.itemId} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 font-medium text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.invoiceNo}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(r.styles || []).map((s) => (
                            <span key={s.id ?? s.style} className={chip}>{s.style}{s.model ? ` · ${s.model}` : ""}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#8a4a24] dark:text-[#d4955e] whitespace-nowrap">{r.itemCodePdm}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.color}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.rollQty}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{Number(r.yds).toLocaleString()}</td>
                      <td className="px-3 py-2"><span className={chipPending}>Pending</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Rack-1"
                            value={drafts[r.itemId] || ""}
                            onChange={(e) => setDrafts((p) => ({ ...p, [r.itemId]: e.target.value }))}
                            className={inputCls}
                          />
                          <button
                            type="button"
                            disabled={assigningId === r.itemId}
                            onClick={() => handleAssign(r.itemId)}
                            className={`${btnPrimary} shrink-0 px-3 py-1.5`}
                          >
                            {assigningId === r.itemId ? "Assigning..." : "Assign"}
                          </button>
                        </div>
                      </td>
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
