// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-receive/page.js



"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Search, Plus, Pencil, Trash2, PackageSearch, ChevronDown, ChevronUp, X, MapPin } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   Shared style tokens (warm HKD theme, Tailwind-only)
   -- compact / table-like sizing --
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
const chipPending = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b8933a]/15 text-[#8a6a1a] dark:bg-[#e0c068]/15 dark:text-[#e0c068]";
const chipApproved = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#5ca068]/15 text-[#3d7a4a] dark:bg-[#8fca9c]/15 dark:text-[#8fca9c]";

// Thin, theme-matching scrollbar (webkit + firefox) instead of the browser's
// default fat gray one. Applied to every independently-scrolling region so
// each region's scroll is visually distinct from a page-level scroll.
const scrollThin =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-[#b87a4a]/30 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#b87a4a]/50 " +
  "[scrollbar-width:thin] [scrollbar-color:#b87a4a4d_transparent]";

// Dummy rack list used everywhere a Location/Rack needs to be picked.
const RACK_OPTIONS = Array.from({ length: 10 }, (_, i) => `Rack-${i + 1}`);

// Warehouse codes (kept hyphenated everywhere: K-1 / K-2 / K-3).
const WAREHOUSE_OPTIONS = ["K-1", "K-2", "K-3"];

// Standard buyer list for the Buyer dropdown.
const BUYERS = [
  "Decathlon - Knit", "Decathlon - Woven", "Walmart", "Columbia",
  "ZXY", "CTC", "DIESEL", "Sports Group Denmark", "Identity", "Fifth Avenur",
];

// All free-text values are forced upper case as the user types.
const up = (v) => (v || "").toUpperCase();

const emptyForm = {
  date: "", invoiceNo: "", fromType: "Overseas", warehouse: "K-2",
  buyer: "", season: "", po: "", item: "", buy: "", remark: "",
};
const newColor = () => ({ key: crypto.randomUUID(), color: "", roll: "", yds: "" });
const newItemCode = () => ({ key: crypto.randomUUID(), itemCodePdm: "", colors: [newColor()] });
const newStyleRow = () => ({ key: crypto.randomUUID(), style: "", model: "" });

// Separate, clearly-labeled Saved Records search fields -- each one is its
// own small input so "Style" and "Model" (and everything else) never get
// confused with one another, but they all sit on a single scrollable row.
const emptyRecordFilters = {
  invoiceNo: "", buyer: "", po: "", style: "", model: "", itemCodePdm: "", color: "",
};
const RECORD_FILTER_FIELDS = [
  { key: "invoiceNo", label: "Invoice No." },
  { key: "buyer", label: "Buyer" },
  { key: "po", label: "PO" },
  { key: "style", label: "Style" },
  { key: "model", label: "Model" },
  { key: "itemCodePdm", label: "Item Code/PDM" },
  { key: "color", label: "Color" },
];

/* ============================================================
   Small helpers
   ============================================================ */

function Field({ text, required, children }) {
  return (
    <label className="block text-xs">
      <span className={label}>{text} {required && <span className="text-[#b87a4a]">*</span>}</span>
      {children}
    </label>
  );
}

/* ============================================================
   Style + Model rows -- one Style always carries its own Model
   ============================================================ */

function StyleModelRows({ rows, onAdd, onRemove, onChange }) {
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={row.key} className="bg-white dark:bg-[#2a241b] border border-[#2c2417]/8 dark:border-[#e8ddd0]/8 rounded-md p-1.5 grid grid-cols-2 gap-1.5">
          <input type="text" placeholder="Style" value={row.style} onChange={(e) => onChange(row.key, "style", up(e.target.value))} className={inputCls} />
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Model" value={row.model} onChange={(e) => onChange(row.key, "model", up(e.target.value))} className={`${inputCls} flex-1`} />
            {rows.length > 1 && (
              <button type="button" onClick={() => onRemove(row.key)} className="text-[10px] font-medium text-[#b87a4a] hover:underline shrink-0">×</button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#b87a4a] dark:text-[#d4955e] hover:underline">
        <Plus size={11} /> Add Style
      </button>
    </div>
  );
}

/* ============================================================
   StockPreview -- big, clear "already in stock" breakdown for a
   given Item Code/PDM + Color: grouped Rack-wise, then Date-wise
   underneath each rack, with a per-rack total. Shared by the form's
   live preview and the Location Assignment "search before assign".
   ============================================================ */

function StockPreview({ preview }) {
  if (!preview?.length) {
    return <div className="text-[11px] italic text-[#a08060] px-1 py-1">No existing stock found for this Item Code/PDM + Color.</div>;
  }

  const byRack = preview.reduce((acc, r) => {
    const key = r.location || "Unassigned";
    (acc[key] ||= []).push(r);
    return acc;
  }, {});
  const rackNames = Object.keys(byRack).sort();

  return (
    <div className="space-y-2">
      {rackNames.map((rack) => {
        const rows = byRack[rack].slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const totalRoll = rows.reduce((s, r) => s + Number(r.availableRoll || 0), 0);
        const totalYds = rows.reduce((s, r) => s + Number(r.availableYds || 0), 0);
        return (
          <div key={rack} className="rounded-lg border border-[#b87a4a]/30 dark:border-[#d4955e]/30 overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#b87a4a]/12 dark:bg-[#d4955e]/12">
              <span className="flex items-center gap-1 text-xs font-bold text-[#8a4a24] dark:text-[#d4955e]">
                <MapPin size={13} /> {rack}
              </span>
              <span className="text-xs font-bold text-[#8a4a24] dark:text-[#d4955e]">
                {totalRoll} Roll · {totalYds} Yds
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.itemId}
                    title={`Invoice ${r.invoiceNo}`}
                    className="border-t border-[#b87a4a]/10 dark:border-[#d4955e]/10"
                  >
                    <td className="px-2.5 py-1.5 text-[#7a6250] dark:text-[#a8917d] whitespace-nowrap">
                      {r.date?.slice(0, 10)}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-semibold text-[#2c2417] dark:text-[#e8ddd0] whitespace-nowrap">
                      {r.availableRoll} Roll
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-semibold text-[#2c2417] dark:text-[#e8ddd0] whitespace-nowrap">
                      {r.availableYds} Yds
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   ColorRow -- Color/Roll/Yds inputs, plus a live "already in stock"
   preview (Rack + Date + Qty) for this exact Item Code/PDM + Color,
   pulled from Available Stock as the user types.
   ============================================================ */

function ColorRow({ itemCodePdm, color, canRemove, onRemove, onChange }) {
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const code = (itemCodePdm || "").trim();
    const col = (color.color || "").trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!code || !col) {
      setPreview([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const params = new URLSearchParams({ itemCodePdm: code, color: col });
        const res = await fetch(`${API_URL}/material-stock?${params.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("lookup failed");
        const data = await res.json();
        setPreview(data.rows || []);
      } catch {
        setPreview([]);
      } finally {
        setLoadingPreview(false);
        setHasSearched(true);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCodePdm, color.color]);

  return (
    <div className="bg-white dark:bg-[#2a241b] border border-[#2c2417]/8 dark:border-[#e8ddd0]/8 rounded-md p-1.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <input type="text" placeholder="Color" value={color.color} onChange={(e) => onChange(color.key, "color", up(e.target.value))} className={`${inputCls} flex-1`} />
        {canRemove && (
          <button type="button" onClick={() => onRemove(color.key)} className="text-[10px] font-medium text-[#b87a4a] hover:underline shrink-0">
            ×
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input type="number" placeholder="Roll" value={color.roll} onChange={(e) => onChange(color.key, "roll", e.target.value)} className={inputCls} />
        <input type="number" placeholder="Yds" value={color.yds} onChange={(e) => onChange(color.key, "yds", e.target.value)} className={inputCls} />
      </div>

      {loadingPreview && (
        <div className="text-[10px] text-[#a08060] italic">Checking existing stock...</div>
      )}
      {!loadingPreview && hasSearched && (
        <div className="pt-1 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7a6250] dark:text-[#a8917d]">
            Already in Stock
          </div>
          <StockPreview preview={preview} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ItemCodeCard (merged) -- compact row layout
   ============================================================ */

function ItemCodeCard({ itemCode, index, canRemove, onNameChange, onRemove, onAddColor, onRemoveColor, onColorChange }) {
  return (
    <div className={`${card} p-2 space-y-1.5`}>
      <div className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#b87a4a]/15 text-[#b87a4a] dark:bg-[#d4955e]/15 dark:text-[#d4955e] text-[10px] font-semibold">
          {index + 1}
        </span>
        <input type="text" placeholder="Item Code / PDM" value={itemCode.itemCodePdm}
          onChange={(e) => onNameChange(up(e.target.value))} className={`${inputCls} flex-1`} />
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-[10px] font-medium text-[#b87a4a] hover:underline shrink-0">
            Remove
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {itemCode.colors.map((c) => (
          <ColorRow
            key={c.key}
            itemCodePdm={itemCode.itemCodePdm}
            color={c}
            canRemove={itemCode.colors.length > 1}
            onRemove={onRemoveColor}
            onChange={onColorChange}
          />
        ))}
      </div>

      <button type="button" onClick={onAddColor} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#b87a4a] dark:text-[#d4955e] hover:underline">
        <Plus size={11} /> Add Color
      </button>
    </div>
  );
}

/* ============================================================
   Item Code / Color breakdown -- real sub-table, with inline
   Location/Rack assignment for pending rows right here, plus a
   "search before assign" toggle that shows where this exact
   Item Code/PDM + Color already sits (Rack + Date-wise) before
   you commit to a rack.

   Rendered as a distinct blue/slate "drawer" panel (not the page's
   orange/brown palette) with a left accent border + margin + shadow,
   so it's immediately obvious this whole block is the "Items under
   Invoice X" expansion and NOT just another striped table row.
   ============================================================ */

function ItemsBreakdownTable({ invoiceNo, items, onAssigned }) {
  const [rackChoice, setRackChoice] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [openPreviewId, setOpenPreviewId] = useState(null);
  const [previewData, setPreviewData] = useState({});
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  if (!items?.length) {
    return <tr><td colSpan={12} className="px-3 py-2 text-[11px] italic text-[#a08060]">No item code / color rows found.</td></tr>;
  }

  const handleAssign = async (itemId) => {
    const rack = rackChoice[itemId] || RACK_OPTIONS[0];
    setAssigningId(itemId);
    setRowError((p) => ({ ...p, [itemId]: "" }));
    try {
      const res = await fetch(`${API_URL}/location-assignment/${itemId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: rack }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to assign location"); }
      onAssigned?.();
    } catch (err) {
      setRowError((p) => ({ ...p, [itemId]: err.message }));
    } finally {
      setAssigningId(null);
    }
  };

  const togglePreview = async (row) => {
    if (openPreviewId === row.id) { setOpenPreviewId(null); return; }
    setOpenPreviewId(row.id);
    if (previewData[row.id]) return; // already fetched, no need to refetch
    setPreviewLoadingId(row.id);
    try {
      const params = new URLSearchParams({ itemCodePdm: row.itemCodePdm, color: row.color });
      const res = await fetch(`${API_URL}/material-stock?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("lookup failed");
      const data = await res.json();
      setPreviewData((p) => ({ ...p, [row.id]: data.rows || [] }));
    } catch {
      setPreviewData((p) => ({ ...p, [row.id]: [] }));
    } finally {
      setPreviewLoadingId(null);
    }
  };

  return (
    <tr>
      <td colSpan={12} className="p-0">
        {/* Distinct blue/slate "drawer" wrapper -- deliberately a different
            color family from the orange/brown page theme, plus margin,
            rounded corners, left accent border and an inner shadow, so it
            reads as a nested panel sitting inside the row, not as another
            plain table row in the Saved Records list. */}
        <div className="mx-2 my-2 rounded-lg border-l-4 border-[#3d6a8a] dark:border-[#6fa8d0] bg-[#eef3f7] dark:bg-[#182530] shadow-inner overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#2c4a63] dark:bg-[#3d6a8a]">
            <PackageSearch size={14} className="text-[#a8d0e8]" />
            <span className="text-xs font-bold uppercase tracking-wide text-white">
              Items under Invoice {invoiceNo}
            </span>
          </div>
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="text-[#4a6578] dark:text-[#8fb0c4] border-b-2 border-[#3d6a8a]/20 dark:border-[#6fa8d0]/20 bg-[#dde8ef]/60 dark:bg-white/[0.03]">
                <th className="px-3 py-2 text-left font-semibold w-1/4">Item Code / PDM</th>
                <th className="px-3 py-2 text-left font-semibold">Color</th>
                <th className="px-3 py-2 text-left font-semibold">Roll</th>
                <th className="px-3 py-2 text-left font-semibold">Yds</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold w-72">Location</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => {
                const rowId = row.id ?? row.key ?? `${row.itemCodePdm}-${row.color}`;
                const isPending = row.status !== "approved";
                const previewOpen = openPreviewId === row.id;
                return (
                  <Fragment key={rowId}>
                    <tr className={`border-b border-[#3d6a8a]/10 dark:border-[#6fa8d0]/10 last:border-b-0 ${idx % 2 === 1 ? "bg-[#3d6a8a]/[0.04] dark:bg-[#6fa8d0]/[0.04]" : ""}`}>
                      <td className="px-3 py-2 text-[#2c4a63] dark:text-[#8fb0c4] font-bold">{row.itemCodePdm}</td>
                      <td className="px-3 py-2 font-medium">{row.color}</td>
                      <td className="px-3 py-2">{row.rollQty}</td>
                      <td className="px-3 py-2">{row.yds}</td>
                      <td className="px-3 py-2">
                        <span className={row.status === "approved" ? chipApproved : chipPending}>
                          {row.status === "approved" ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {!isPending ? (
                          <span className="inline-flex items-center gap-1"><MapPin size={11} className="text-[#a08060]" />{row.location || "—"}</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => togglePreview(row)}
                                title="Search existing stock for this Item Code/PDM + Color before assigning"
                                className={`inline-flex items-center justify-center h-[30px] w-[30px] shrink-0 rounded-md border-[1.5px] transition-colors ${
                                  previewOpen
                                    ? "border-[#3d6a8a] bg-[#3d6a8a]/15 text-[#2c4a63] dark:border-[#6fa8d0] dark:bg-[#6fa8d0]/15 dark:text-[#6fa8d0]"
                                    : "border-[#2c4a63]/25 dark:border-[#6fa8d0]/25 text-[#4a6578] dark:text-[#8fb0c4] hover:border-[#3d6a8a] hover:text-[#3d6a8a]"
                                }`}
                              >
                                <Search size={13} />
                              </button>
                              <select
                                value={rackChoice[row.id] || RACK_OPTIONS[0]}
                                onChange={(e) => setRackChoice((p) => ({ ...p, [row.id]: e.target.value }))}
                                className={`${inputCls} flex-1`}
                              >
                                {RACK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAssign(row.id)}
                                disabled={assigningId === row.id}
                                className="inline-flex items-center gap-1 rounded-full bg-[#2c4a63] dark:bg-[#3d6a8a] text-white text-[10px] font-medium px-2.5 py-1.5 hover:bg-[#3d6a8a] dark:hover:bg-[#4a7a9a] transition-colors disabled:opacity-50 shrink-0"
                              >
                                {assigningId === row.id ? "..." : "Assign"}
                              </button>
                            </div>
                            {rowError[row.id] && <div className="text-[10px] text-[#a04a3a]">{rowError[row.id]}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                    {isPending && previewOpen && (
                      <tr className="bg-[#3d6a8a]/[0.06] dark:bg-[#6fa8d0]/[0.04]">
                        <td colSpan={6} className="px-3 py-2.5">
                          {previewLoadingId === row.id ? (
                            <div className="text-[11px] text-[#a08060] italic">Checking existing stock...</div>
                          ) : (
                            <StockPreview preview={previewData[row.id] || []} />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

/* ============================================================
   Saved Records search row -- one clearly-labeled input per field
   (Invoice No., Buyer, PO, Style, Model, Item Code/PDM, Color),
   all sitting on a single horizontally-scrollable line so nothing
   gets confused with anything else.
   ============================================================ */

function RecordFilterRow({ filters, setFilters }) {
  const anyActive = Object.values(filters).some((v) => v && v.trim());
  return (
    <div className={`flex items-end gap-1.5 overflow-x-auto pb-0.5 ${scrollThin}`}>
      {RECORD_FILTER_FIELDS.map((f, i) => (
        <label key={f.key} className="shrink-0 w-[132px]">
          <span className="block mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#a08060] whitespace-nowrap">
            {f.label}
          </span>
          <div className="relative">
            {i === 0 && <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a08060]" />}
            <input
              type="text"
              value={filters[f.key]}
              onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.label}
              className={`${inputCls} text-[11px] py-1 ${i === 0 ? "pl-6" : ""}`}
            />
          </div>
        </label>
      ))}
      {anyActive && (
        <button
          type="button"
          onClick={() => setFilters(emptyRecordFilters)}
          className="shrink-0 self-stretch flex items-center text-[10px] font-medium text-[#b87a4a] hover:underline px-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Records panel -- a real HTML table, sits beside the form
   ============================================================ */

function RecordsPanel({ filters, setFilters, receives, loading, expandedIds, toggleExpanded, onEdit, onDelete, onAssigned }) {
  return (
    <div className={`${card} flex flex-col h-full overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 shrink-0">
        <PackageSearch size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Saved Records</h2>
        <span className="text-[11px] text-[#a08060]">({receives.length})</span>
        <span className="text-[10px] text-[#a08060] ml-auto">Newest first</span>
      </div>

      <div className="px-4 py-2.5 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10 shrink-0">
        <RecordFilterRow filters={filters} setFilters={setFilters} />
      </div>

      <div className={`flex-1 min-h-0 overflow-auto ${scrollThin}`}>
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
        ) : receives.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-xs">No material receives found.</div>
        ) : (
          <table className="min-w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-6"></th>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Invoice No.</th>
                <th className="px-3 py-2 text-left font-semibold">From</th>
                <th className="px-3 py-2 text-left font-semibold">Warehouse</th>
                <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold">Season</th>
                <th className="px-3 py-2 text-left font-semibold">PO</th>
                <th className="px-3 py-2 text-left font-semibold">Style / Model</th>
                <th className="px-3 py-2 text-left font-semibold">Items</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receives.map((r) => {
                const isOpen = expandedIds.has(r.id);
                const isApproved = r.status === "approved";
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => toggleExpanded(r.id)}
                      title={r.remark || undefined}
                      className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 cursor-pointer hover:bg-[#b87a4a]/5"
                    >
                      <td className="px-3 py-2 text-[#a08060]">
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-medium text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.invoiceNo}</td>
                      <td className="px-3 py-2"><span className={chip}>{r.fromType}</span></td>
                      <td className="px-3 py-2"><span className={chip}>{r.warehouse}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.buyer}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.season}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.po}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(r.styles || []).map((s) => (
                            <span key={s.id ?? s.style} className={chip}>{s.style}{s.model ? ` · ${s.model}` : ""}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className={chip}>{r.totalItems}</span></td>
                      <td className="px-3 py-2">
                        <span className={isApproved ? chipApproved : chipPending}>{isApproved ? "Approved" : "Pending"}</span>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => onEdit(r.id)} disabled={isApproved} title={isApproved ? "Fully approved receives can't be edited" : "Edit"}
                            className="inline-flex items-center gap-1 font-medium text-[#b87a4a] hover:underline disabled:opacity-40 disabled:pointer-events-none">
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => onDelete(r.id)} disabled={isApproved} title={isApproved ? "Fully approved receives can't be deleted" : "Delete"}
                            className="inline-flex items-center gap-1 font-medium text-[#a04a3a] hover:underline disabled:opacity-40 disabled:pointer-events-none">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && <ItemsBreakdownTable invoiceNo={r.invoiceNo} items={r.items} onAssigned={onAssigned} />}
                  </Fragment>
                );
              })}
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

export default function MaterialReceivePage() {
  const [form, setForm] = useState(emptyForm);
  const [styleRows, setStyleRows] = useState([newStyleRow()]);
  const [itemCodes, setItemCodes] = useState([newItemCode()]);
  const [receives, setReceives] = useState([]);
  const [recordFilters, setRecordFilters] = useState(emptyRecordFilters);
  const [editingId, setEditingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  // The backend's /material-receive?search= endpoint takes one fuzzy string
  // that matches across invoice/buyer/PO/style/model/item-code/color. The UI
  // now has one clearly-labeled input per field, so we just join whatever
  // the user typed into those separate boxes into that single search string.
  const combinedSearch = useMemo(
    () => RECORD_FILTER_FIELDS.map((f) => recordFilters[f.key]).filter((v) => v && v.trim()).join(" "),
    [recordFilters]
  );

  const fetchReceives = useCallback(async (searchTerm = "") => {
    setLoading(true); setError("");
    try {
      const url = searchTerm ? `${API_URL}/material-receive?search=${encodeURIComponent(searchTerm)}` : `${API_URL}/material-receive`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load material receives");
      setReceives(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReceives(); }, [fetchReceives]);
  useEffect(() => { const t = setTimeout(() => fetchReceives(combinedSearch), 400); return () => clearTimeout(t); }, [combinedSearch, fetchReceives]);

  const resetForm = () => {
    setForm(emptyForm); setStyleRows([newStyleRow()]); setItemCodes([newItemCode()]); setEditingId(null);
  };

  const addStyleRow = () => setStyleRows((p) => [...p, newStyleRow()]);
  const removeStyleRow = (key) => setStyleRows((p) => p.filter((s) => s.key !== key));
  const updateStyleRow = (key, field, v) => setStyleRows((p) => p.map((s) => (s.key === key ? { ...s, [field]: v } : s)));

  const addItemCode = () => setItemCodes((p) => [...p, newItemCode()]);
  const removeItemCode = (key) => setItemCodes((p) => p.filter((ic) => ic.key !== key));
  const updateItemCodeName = (key, v) => setItemCodes((p) => p.map((ic) => (ic.key === key ? { ...ic, itemCodePdm: v } : ic)));
  const addColor = (key) => setItemCodes((p) => p.map((ic) => (ic.key === key ? { ...ic, colors: [...ic.colors, newColor()] } : ic)));
  const removeColor = (key, ck) => setItemCodes((p) => p.map((ic) => (ic.key === key ? { ...ic, colors: ic.colors.filter((c) => c.key !== ck) } : ic)));
  const updateColor = (key, ck, field, v) =>
    setItemCodes((p) => p.map((ic) => (ic.key === key ? { ...ic, colors: ic.colors.map((c) => (c.key === ck ? { ...c, [field]: v } : c)) } : ic)));

  const toggleExpanded = (id) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");

    const styles = styleRows.filter((s) => s.style.trim()).map((s) => ({ style: s.style.trim(), model: s.model.trim() }));
    if (styles.length === 0) { setError("Add at least one Style (with its Model)."); return; }

    const items = itemCodes.flatMap((ic) =>
      ic.colors.filter((c) => c.color).map((c) => ({ itemCodePdm: ic.itemCodePdm, color: c.color, rollQty: c.roll, yds: c.yds }))
    );
    if (items.length === 0) { setError("Add at least one Item Code/PDM with a Color row."); return; }

    setSaving(true);
    try {
      const url = editingId ? `${API_URL}/material-receive/${editingId}` : `${API_URL}/material-receive`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, styles, items }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to save material receive"); }
      setSuccess(editingId ? "Material receive updated." : "Material receive saved.");
      resetForm(); fetchReceives(combinedSearch);
      setFormOpen(false);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleNewReceive = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleEdit = async (id) => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/material-receive/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load material receive");
      const data = await res.json();
      setForm({
        date: data.date?.slice(0, 10) || "", invoiceNo: data.invoiceNo || "", fromType: data.fromType || "Overseas",
        warehouse: data.warehouse || "K-2", buyer: data.buyer || "", season: data.season || "", po: data.po || "",
        item: data.item || "", buy: data.buy || "", remark: data.remark || "",
      });

      setStyleRows(
        (data.styles || []).length
          ? data.styles.map((s) => ({ key: crypto.randomUUID(), style: s.style, model: s.model || "" }))
          : [newStyleRow()]
      );

      const grouped = [];
      for (const row of data.items) {
        let g = grouped.find((g) => g.itemCodePdm === row.itemCodePdm);
        if (!g) { g = { key: crypto.randomUUID(), itemCodePdm: row.itemCodePdm, colors: [] }; grouped.push(g); }
        g.colors.push({ key: crypto.randomUUID(), color: row.color, roll: row.rollQty, yds: row.yds });
      }
      setItemCodes(grouped.length ? grouped : [newItemCode()]);
      setEditingId(id);
      setFormOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this Material Receive? This cannot be undone.")) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/material-receive/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to delete material receive"); }
      setSuccess("Material receive deleted."); fetchReceives(combinedSearch);
    } catch (err) { setError(err.message); }
  };

  // Keep the current buyer visible in the dropdown even if it's not one of
  // the standard BUYERS (e.g. an older record saved before this list existed).
  const buyerOptions = form.buyer && !BUYERS.includes(form.buyer) ? [form.buyer, ...BUYERS] : BUYERS;

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageSearch size={22} className="text-[#b87a4a]" />
            <div>
              <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
                Material <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Receive</em>
              </h1>
              <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
                Record incoming fabric/material invoices, grouped by Item Code/PDM and Color. Expand a Saved Record
                below to assign its Location/Rack.
              </p>
            </div>
          </div>
          {!formOpen && (
            <button type="button" onClick={handleNewReceive} className={btnPrimary}>
              <Plus size={13} /> New Material Receive
            </button>
          )}
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}
        {success && <div className="rounded-lg bg-[#5ca068]/10 border border-[#5ca068]/25 text-[#3d7a4a] dark:text-[#8fca9c] text-xs px-3 py-2">{success}</div>}

        {/*
          FORM + RECORDS TABLE, side by side, each with its OWN
          independent scroll region:

          - Outer wrapper (per column) is `sticky` at `top-6` and capped
            to the viewport height with `max-h-[calc(100vh-3rem)]`.
          - Inner content scrolls with `overflow-y-auto`.
          - Both scroll regions use the shared `scrollThin` thin,
            theme-colored scrollbar instead of the browser default.

          Because each column's scroll container is separate and capped
          to the viewport (not to each other's height), scrolling the
          form never moves the table and scrolling the table never
          moves the form.
        */}
        <div className="flex items-start gap-4">
          {/* FORM COLUMN */}
          <div
            className={`shrink-0 transition-all duration-300 ease-in-out ${
              formOpen ? "w-[340px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-6 pointer-events-none"
            }`}
          >
            <div className={`sticky top-6 w-[340px] max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden ${scrollThin}`}>
              <form onSubmit={handleSubmit} className={`${card} p-3 space-y-3 w-[340px]`}>
                <div className="flex items-center justify-between pb-1 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
                  <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">
                    {editingId ? "Edit Receive" : "Receive Details"}
                  </h2>
                  <button type="button" onClick={() => { setFormOpen(false); if (editingId) resetForm(); }}
                    className="text-[#a08060] hover:text-[#b87a4a] transition-colors" title="Close">
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  <Field text="Date" required><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
                  <Field text="Invoice No." required><input type="text" required value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="From" required>
                    <select value={form.fromType} onChange={(e) => setForm({ ...form, fromType: e.target.value })} className={inputCls}>
                      <option value="Overseas">Overseas</option><option value="Local">Local</option>
                    </select>
                  </Field>
                  <Field text="Warehouse" required>
                    <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} className={inputCls}>
                      {WAREHOUSE_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field text="Buyer" required>
                      <select required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} className={inputCls}>
                        <option value="" disabled>Select buyer...</option>
                        {buyerOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field text="Season" required><input type="text" required value={form.season} onChange={(e) => setForm({ ...form, season: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="PO" required><input type="text" required value={form.po} onChange={(e) => setForm({ ...form, po: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="Item" required><input type="text" required value={form.item} onChange={(e) => setForm({ ...form, item: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="Buy" required><input type="text" required value={form.buy} onChange={(e) => setForm({ ...form, buy: up(e.target.value) })} className={inputCls} /></Field>

                  <div className="col-span-2">
                    <Field text="Remark">
                      <textarea
                        rows={2}
                        value={form.remark}
                        onChange={(e) => setForm({ ...form, remark: up(e.target.value) })}
                        placeholder="Optional note..."
                        className={`${inputCls} resize-none`}
                      />
                    </Field>
                  </div>

                  <div className="col-span-2">
                    <Field text="Style + Model" required>
                      <StyleModelRows rows={styleRows} onAdd={addStyleRow} onRemove={removeStyleRow} onChange={updateStyleRow} />
                    </Field>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
                    <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc]">Item Code / PDM &amp; Colors</h2>
                  </div>
                  <button type="button" onClick={addItemCode} className={`${btnSecondary} w-full justify-center`}><Plus size={13} /> Add Item Code/PDM</button>
                  <div className="space-y-1.5">
                    {itemCodes.map((ic, i) => (
                      <ItemCodeCard key={ic.key} itemCode={ic} index={i} canRemove={itemCodes.length > 1}
                        onNameChange={(v) => updateItemCodeName(ic.key, v)} onRemove={() => removeItemCode(ic.key)}
                        onAddColor={() => addColor(ic.key)} onRemoveColor={(ck) => removeColor(ic.key, ck)}
                        onColorChange={(ck, f, v) => updateColor(ic.key, ck, f, v)} />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
                  <button type="submit" disabled={saving} className={`${btnPrimary} w-full justify-center`}>
                    {saving ? "Saving..." : editingId ? "Update Material Receive" : "Save Material Receive"}
                  </button>
                  {editingId && <button type="button" onClick={() => { resetForm(); setFormOpen(false); }} className={`${btnSecondary} w-full justify-center`}>Cancel Edit</button>}
                </div>
              </form>
            </div>
          </div>

          {/* RECORDS COLUMN -- sticky + viewport-capped, own scroll region */}
          <div className="flex-1 min-w-0 sticky top-6 max-h-[calc(100vh-3rem)] overflow-hidden">
            <RecordsPanel
              filters={recordFilters}
              setFilters={setRecordFilters}
              receives={receives}
              loading={loading}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssigned={() => fetchReceives(combinedSearch)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}