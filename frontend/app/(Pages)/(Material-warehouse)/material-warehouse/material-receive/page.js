// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-receive/page.js

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Search, Plus, Pencil, Trash2, PackageSearch, ChevronDown, ChevronUp, X, MapPin, Check } from "lucide-react";

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
const chipPartial = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#3d6a8a]/15 text-[#2c4a63] dark:bg-[#6fa8d0]/15 dark:text-[#6fa8d0]";
const chipApproved = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#5ca068]/15 text-[#3d7a4a] dark:bg-[#8fca9c]/15 dark:text-[#8fca9c]";
// NEW: two extra statuses introduced by the Material Inspection workflow --
// "pending_inspection" (just received, not looked at yet) and "rejected"
// (inspection passed 0 Roll / 0 Yds).
const chipInspection = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7a4a8a]/15 text-[#5c3468] dark:bg-[#c68fd4]/15 dark:text-[#c68fd4]";
const chipRejected = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#a04a3a]/15 text-[#7a3325] dark:bg-[#e08a78]/15 dark:text-[#e08a78]";

// Thin, theme-matching scrollbar (webkit + firefox) instead of the browser's
// default fat gray one. Applied to every independently-scrolling region so
// each region's scroll is visually distinct from a page-level scroll.
const scrollThin =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-[#b87a4a]/30 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#b87a4a]/50 " +
  "[scrollbar-width:thin] [scrollbar-color:#b87a4a4d_transparent]";

// Same scroll region, but the bar itself is fully hidden (Chrome/Safari via
// ::-webkit-scrollbar, Firefox via scrollbar-width, old Edge/IE via
// -ms-overflow-style). Scrolling still works with wheel/trackpad/touch/
// keyboard -- only the visual track+thumb disappear. Used on the form
// column, where a bar looked cluttered next to the compact 340px card.
const scrollHidden =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const RACK_OPTIONS = [
  "G-J-19", "G-I-14", "G-W-8", "G-X-20", "G-X-19", "G-J-23", "G-W-7", "L-40", "G-F-3", "G-I-4", "G-I-5", "F-46", "QA", "K-20", "G-X-3", "G-J-17", "F-44", "G-J-26", "G-W-13", "G-I-21", "G-X-1", "G-X-25", "G-J-24", "G-X-17", "G-U-23", "G-Y-1", "J-48", "G-I-10", "G-W-27", "G-E-8", "G-E-14", "G-E-4", "G-U-17", "G-T-3", "G-Y-11", "G-F-16", "G-T-11", "G-T-5", "G-I-17", "G-W-5", "G-U-22", "G-Y-3", "G-J-15", "G-S-11", "G-X-21", "G-U-19", "G-U-2", "G-36", "G-33", "G-T-12", "G-U-20", "L-39", "G-I-9", "G-W-9", "G-I-15", "G-48", "H-11", "G-X-13", "U-46", "G-U-21", "J-35", "V-22", "W-33", "W-34", "I-38", "F-45", "G-H-11", "G-T-14", "G-T-15", "G-T-7", "G-W-10", "G-W-11", "G-H-5", "SAMPLE", "G-W-17", "G-H-7", "L-36", "I-40", "J-44", "G-X-22", "J-47", "G-X-15", "G-T-26", "G-T-28", "G-L-17", "G-I-13", "L-34", "J-43", "G-L-21", "G-L-13", "G-L-11", "G-F-1", "G-K-6", "G-X-18", "G-V-5", "G-J-18", "G-K-13", "G-L-16", "G-L-10", "G-X-23", "G-E-13", "G-T-25", "G-U-13", "G-V-3", "G-T-19", "G-U-28", "G-X-28", "T-37", "G-L-2", "G-S-12", "G-X-26", "G-S-7", "G-W-19", "F-47", "G-R-19", "G-I-31", "G-I-32", "G-U-4", "G-I-2", "G-L-1", "G-S-13", "G-L-15", "G-I-29", "G-L-5", "G-W-23", "G-U-18", "G-R-23", "G-W-22", "G-R-24", "G-R-26", "G-Y-14", "G-U-5", "G-W-1", "L-35", "J-42", "J-33", "G-L-9", "K-16", "J-45", "L-33", "G-U-3", "G-V-9", "G-U-7", "G-T-9", "U-39", "T-38", "T-34", "T-35", "G-K-4", "G-E-6", "G-L-4", "T-41", "T-36", "G-J-3", "G-I-24", "G-I-26", "G-I-19", "G-I-3", "G-R-20", "G-V-7", "G-U-25", "G-V-19", "AC ROOM", "G-40", "L-44", "U-34", "U-36", "G-X-9", "G-R-21", "G-R-22", "G-U-16", "G-E-12", "G-E-10", "K-18", "K-17", "G-Y-2", "U-43", "G-Y-8", "G-Y-6", "G-Y-4", "G-S-9", "T-40", "G-W-21", "G-X-5", "G-W-3", "G-W-25", "G-I-28", "G-W-15", "G-H-3", "G-H-2", "G-I-11", "G-I-25", "G-E-3", "G-R-17", "G-H-9", "F-41", "G-38", "G-R-25", "J-38", "I-48", "L-48", "K-15", "L-45", "L-47", "G-K-14", "G-L-3", "G-J-2", "G-J-4", "G-J-11", "G-J-13", "G-J-16", "G-J-14", "G-J-5", "G-J-7", "G-J-9", "G-J-1", "G-J-10", "L-46", "T-42", "U-42", "J-34", "V-19", "G-R-16", "G-W-6", "G-S-8", "T-44", "F-42", "F-48", "G-E-2", "G-E-5", "G-J-20", "G-J-31", "G-J-22", "G-J-25", "I-33", "I-35", "J-41", "I-44", "J-46", "G-K-7", "T-43", "T-46", "G-K-11", "G-W-4", "K-19", "G-X-7", "G-X-12", "G-X-14", "G-Y-7", "G-Y-10", "G-Y-12", "V-21", "G-L-22", "G-V-13", "G-X-27", "G-L-24", "L-38", "V-20", "J-39", "Z-20", "Z-19", "L-42", "T-33", "G-X-16", "G-X-4", "G-L-14", "G-L-7", "G-J-28", "U-38", "Y-18", "G-T-8", "G-I-8", "G-I-6", "G-I-1", "G-V-4", "G-E-9", "G-E-7", "G-F-7", "G-R-15", "G-J-30", "G-I-27", "G-K-9", "G-I-18", "V-23", "G-W-28", "G-Y-9", "G-V-2", "G-L-19", "G-L-12", "G-L-23", "G-Y-5", "I-43", "I-45", "I-47", "J-37", "T-39", "G-F-15", "G-J-12", "G-S-6", "G-X-10", "G-F-10", "G-R-27", "G-F-13", "G-F-9", "G-F-2", "G-W-12", "G-T-6", "J-36", "G-J-32", "G-H-8", "G-L-26", "I-46", "G-L-32", "G-L-18", "G-L-6", "G-F-4", "G-L-30", "G-W-16", "G-I-20", "G-X-11", "G-L-27", "G-I-30", "G-W-2", "G-L-31", "G-L-25", "G-L-29", "G-L-8", "G-L-20", "G-K-1", "G-K-3", "G-K-10", "G-K-12", "G-K-2"
];

// Warehouse codes (kept hyphenated everywhere: K-1 / K-2 / K-3).
const WAREHOUSE_OPTIONS = ["K-1", "K-2", "K-3"];

// Standard buyer list for the Buyer dropdown.
const BUYERS = [
  "Decathlon - Knit", "Decathlon - Woven", "Walmart", "Columbia",
  "ZXY", "CTC", "DIESEL", "Sports Group Denmark", "Identity", "Fifth Avenur",
];

// All free-text values are forced upper case as the user types.
const up = (v) => (v || "").toUpperCase();

// crypto.randomUUID() is only available in secure contexts (HTTPS or localhost).
// On a plain-HTTP origin (e.g. http://192.169.11.38:3000) it is undefined, and
// calling it during the initial render crashed the whole page. Use it when
// available and fall back to a locally-generated unique id otherwise.
const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// "supplier" is optional free text at the invoice/parent level (one per
// Material Receive, same as Buyer/PO/etc.). "buy" is also optional free
// text at the invoice/parent level -- whoever wants to fill it in, can.
const emptyForm = {
  date: "", invoiceNo: "", fromType: "Overseas", warehouse: "K-2",
  buyer: "", supplier: "", season: "", po: "", item: "", buy: "", remark: "",
};
// "fabricDetails" is REQUIRED free text at the item/batch level -- one per
// Item Code/PDM + Color row, since different colors/item codes on the
// same invoice can be different fabrics and this is now mandatory data.
const newColor = () => ({ key: uid(), color: "", fabricDetails: "", roll: "", yds: "" });
const newItemCode = () => ({ key: uid(), itemCodePdm: "", colors: [newColor()] });
const newStyleRow = () => ({ key: uid(), style: "", model: "" });

// Separate, clearly-labeled Saved Records search fields -- each one is its
// own small input (Buyer is a dropdown, same options as the form) so
// "Style" and "Model" (and everything else) never get confused with one
// another, but they all sit on a single scrollable row. Each field is sent
// to the backend as its OWN query param and matched only against its own
// column there -- see fetchReceives below.
const emptyRecordFilters = {
  invoiceNo: "", buyer: "", supplier: "", po: "", style: "", model: "", itemCodePdm: "", color: "", fabricDetails: "",
};
const RECORD_FILTER_FIELDS = [
  { key: "invoiceNo", label: "Invoice No." },
  { key: "buyer", label: "Buyer", type: "select" },
  { key: "supplier", label: "Supplier" },
  { key: "po", label: "PO" },
  { key: "style", label: "Style" },
  { key: "model", label: "Model" },
  { key: "itemCodePdm", label: "Item Code/PDM" },
  { key: "color", label: "Color" },
  { key: "fabricDetails", label: "Fabric Details" },
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

// Batch/item status chip. Five possible statuses now that Material
// Inspection sits between Receive and Location Assignment:
//   "pending_inspection" -> just received, nobody has inspected it yet
//   "pending"             -> inspected, some/all passed, nothing racked yet
//   "partial"             -> some racked, some still unassigned
//   "approved"            -> fully racked
//   "rejected"            -> inspection passed 0 Roll / 0 Yds
function statusChip(status) {
  if (status === "approved") return <span className={chipApproved}>Approved</span>;
  if (status === "partial") return <span className={chipPartial}>Partially Assigned</span>;
  if (status === "pending_inspection") return <span className={chipInspection}>Awaiting Inspection</span>;
  if (status === "rejected") return <span className={chipRejected}>Rejected</span>;
  return <span className={chipPending}>Pending</span>;
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
  ColorRow -- Color/Fabric Details/Roll/Yds inputs, plus a live
   "already in stock" preview (Rack + Date + Qty) for this exact
   Item Code/PDM + Color, pulled from Available Stock as the user
  types. Fabric Details is REQUIRED and does not affect the stock
   lookup (which is keyed on Item Code/PDM + Color only).
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
      <input
        type="text"
        required
        placeholder="Fabric Details *"
        value={color.fabricDetails}
        onChange={(e) => onChange(color.key, "fabricDetails", up(e.target.value))}
        className={inputCls}
      />
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
   AllocationList -- shows a batch's existing rack allocations
   (Rack, Roll, Yds), each editable inline or removable. This is
   what lets a single 100-roll batch show up as e.g.
     Rack-1: 70 Roll / 700 Yds   [Edit] [Remove]
     Rack-2: 30 Roll / 300 Yds   [Edit] [Remove]
   ============================================================ */

function AllocationList({ locations, onSaveEdit, onDelete, busyId }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ location: "", roll: "", yds: "" });

  if (!locations?.length) {
    return <div className="text-[10px] italic text-[#a08060]">No rack assigned yet.</div>;
  }

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setDraft({ location: loc.location, roll: String(loc.rollQty), yds: String(loc.yds) });
  };

  const saveEdit = async (id) => {
    await onSaveEdit(id, { location: draft.location, rollQty: draft.roll, yds: draft.yds });
    setEditingId(null);
  };

  return (
    <div className="space-y-1">
      {locations.map((loc) => {
        const locked = Number(loc.availableRoll) !== Number(loc.rollQty) || Number(loc.availableYds) !== Number(loc.yds);
        const isEditing = editingId === loc.id;
        return (
          <div key={loc.id} className="flex items-center gap-1.5 bg-white dark:bg-[#2a241b] border border-[#2c4a63]/15 dark:border-[#6fa8d0]/15 rounded-md px-2 py-1">
            {isEditing ? (
              <div className="w-full space-y-1">
                {/* Rack select on its own full-width row -- on narrow
                    screens, squeezing this into a row alongside two
                    number inputs and two icon buttons left almost no
                    width for it, so it rendered as just the browser's
                    dropdown arrow with the selected rack name invisible. */}
                <div className="relative">
                  <MapPin size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3d6a8a] dark:text-[#6fa8d0] pointer-events-none" />
                  <select
                    value={draft.location}
                    onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                    className={`${inputCls} !py-1 w-full !pl-6 font-semibold text-[#2c4a63] dark:text-[#6fa8d0]`}
                  >
                    {RACK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={draft.roll} onChange={(e) => setDraft((p) => ({ ...p, roll: e.target.value }))} placeholder="Roll" className={`${inputCls} !py-1 flex-1`} />
                  <input type="number" value={draft.yds} onChange={(e) => setDraft((p) => ({ ...p, yds: e.target.value }))} placeholder="Yds" className={`${inputCls} !py-1 flex-1`} />
                  <button type="button" onClick={() => saveEdit(loc.id)} disabled={busyId === loc.id} className="text-[#3d7a4a] hover:opacity-70 shrink-0"><Check size={15} /></button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-[#a04a3a] hover:opacity-70 shrink-0"><X size={15} /></button>
                </div>
              </div>
            ) : (
              <>
                <MapPin size={11} className="text-[#3d6a8a] dark:text-[#6fa8d0] shrink-0" />
                <span className="font-semibold text-[#2c4a63] dark:text-[#6fa8d0] text-[11px]">{loc.location}</span>
                <span className="text-[11px] text-[#2c2417] dark:text-[#e8ddd0] flex-1">
                  {loc.rollQty} Roll · {loc.yds} Yds
                  {locked && <span className="text-[9px] italic text-[#a08060] ml-1">(issued, locked)</span>}
                </span>
                {!locked && (
                  <>
                    <button type="button" onClick={() => startEdit(loc)} className="text-[#3d6a8a] dark:text-[#6fa8d0] hover:underline text-[10px] font-medium shrink-0">Edit</button>
                    <button type="button" onClick={() => onDelete(loc.id)} disabled={busyId === loc.id} className="text-[#a04a3a] hover:underline text-[10px] font-medium shrink-0">Remove</button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Item Code / Color breakdown -- real sub-table, with inline
   MULTI-RACK Location/Rack assignment for pending/partial rows:
   each row shows its existing per-rack allocations (editable /
   removable) plus a form to assign more of whatever's still
   unassigned, so one batch (e.g. 100 Roll) can be split across
   several racks (e.g. 70 -> Rack-1, 30 -> Rack-2). Also keeps the
   "search before assign" toggle that shows where this exact Item
   Code/PDM + Color already sits (Rack + Date-wise) before you
   commit to a rack.

  Fabric Details is shown as its own read-only column here (it's
   entered once on Material Receive and never edited from this
   drawer).

   A batch now sits in one of FIVE statuses instead of three --
   "pending_inspection" (Material Inspection hasn't looked at it
   yet) and "rejected" (inspection passed 0/0) are both dead ends
   here: the Rack Assignment form is hidden and a short explanatory
   note is shown instead, since Location Assignment can never place
   stock that hasn't passed inspection.

   Rendered as a distinct blue/slate "drawer" panel (not the page's
   orange/brown palette) with a left accent border + margin + shadow,
   so it's immediately obvious this whole block is the "Items under
   Invoice X" expansion and NOT just another striped table row.

   NOTE: colSpan is 14 here to match the parent Saved Records table,
   which now has 14 columns after the Supplier column was added.
   ============================================================ */

function ItemsBreakdownTable({ invoiceNo, items, onAssigned }) {
  const [newAlloc, setNewAlloc] = useState({}); // { [itemId]: { location, roll, yds } }
  const [assigningId, setAssigningId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [openPreviewId, setOpenPreviewId] = useState(null);
  const [previewData, setPreviewData] = useState({});
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  if (!items?.length) {
    return <tr><td colSpan={14} className="px-3 py-2 text-[11px] italic text-[#a08060]">No item code / color rows found.</td></tr>;
  }

  const getDraft = (itemId) => newAlloc[itemId] || { location: RACK_OPTIONS[0], roll: "", yds: "" };
  const setDraft = (itemId, field, v) =>
    setNewAlloc((p) => ({ ...p, [itemId]: { ...getDraft(itemId), [field]: v } }));

  const handleAssign = async (row) => {
    const draft = getDraft(row.id);
    setAssigningId(row.id);
    setRowError((p) => ({ ...p, [row.id]: "" }));
    try {
      const res = await fetch(`${API_URL}/location-assignment/${row.id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: draft.location, rollQty: draft.roll || 0, yds: draft.yds || 0 }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to assign location"); }
      setNewAlloc((p) => ({ ...p, [row.id]: { location: RACK_OPTIONS[0], roll: "", yds: "" } }));
      onAssigned?.();
    } catch (err) {
      setRowError((p) => ({ ...p, [row.id]: err.message }));
    } finally {
      setAssigningId(null);
    }
  };

  const handleSaveAllocationEdit = async (allocationId, { location, rollQty, yds }) => {
    try {
      const res = await fetch(`${API_URL}/location-assignment/allocation/${allocationId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, rollQty, yds }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to update allocation"); }
      onAssigned?.();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAllocation = async (allocationId) => {
    if (!confirm("Remove this rack allocation? The quantity returns to unassigned.")) return;
    try {
      const res = await fetch(`${API_URL}/location-assignment/allocation/${allocationId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to remove allocation"); }
      onAssigned?.();
    } catch (err) {
      alert(err.message);
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
      <td colSpan={14} className="p-0">
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
                <th className="px-3 py-2 text-left font-semibold w-1/5">Item Code / PDM</th>
                <th className="px-3 py-2 text-left font-semibold">Color</th>
                <th className="px-3 py-2 text-left font-semibold">Fabric Details</th>
                <th className="px-3 py-2 text-left font-semibold">Received Roll/Yds</th>
                <th className="px-3 py-2 text-left font-semibold">Passed / Rejected</th>
                <th className="px-3 py-2 text-left font-semibold">Unassigned</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold w-96">Rack Assignment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => {
                const rowId = row.id ?? row.key ?? `${row.itemCodePdm}-${row.color}`;
                // Only "pending" / "partial" (i.e. batches that have PASSED
                // Material Inspection and aren't fully racked yet) can be
                // targeted for a new rack assignment. "pending_inspection"
                // and "rejected" have nothing available to place; "approved"
                // is already fully placed.
                const isLocked = row.status === "approved" || row.status === "pending_inspection" || row.status === "rejected";
                const previewOpen = openPreviewId === row.id;
                const draft = getDraft(row.id);
                return (
                  <Fragment key={rowId}>
                    <tr className={`border-b border-[#3d6a8a]/10 dark:border-[#6fa8d0]/10 last:border-b-0 ${idx % 2 === 1 ? "bg-[#3d6a8a]/[0.04] dark:bg-[#6fa8d0]/[0.04]" : ""}`}>
                      <td className="px-3 py-2 text-[#2c4a63] dark:text-[#8fb0c4] font-bold align-top">{row.itemCodePdm}</td>
                      <td className="px-3 py-2 font-medium align-top">{row.color}</td>
                      <td className="px-3 py-2 align-top">
                        {row.fabricDetails || <span className="italic text-[#a08060]">-</span>}
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">{row.rollQty} Roll / {row.yds} Yds</td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        {row.status === "pending_inspection" ? (
                          <span className="italic text-[#a08060]">not inspected</span>
                        ) : (
                          <>
                            <span className="text-[#3d7a4a] dark:text-[#8fca9c] font-semibold">{row.passedRoll} Roll / {row.passedYds} Yds</span>
                            {Number(row.rejectedRoll) > 0 || Number(row.rejectedYds) > 0 ? (
                              <span className="block text-[#a04a3a]">{row.rejectedRoll} Roll / {row.rejectedYds} Yds rejected</span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap font-semibold text-[#8a4a24] dark:text-[#d4955e]">
                        {row.unassignedRoll} Roll / {row.unassignedYds} Yds
                      </td>
                      <td className="px-3 py-2 align-top">{statusChip(row.status)}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-1.5">
                          {/* Existing rack allocations for this batch */}
                          <AllocationList
                            locations={row.locations}
                            onSaveEdit={handleSaveAllocationEdit}
                            onDelete={handleDeleteAllocation}
                            busyId={assigningId}
                          />

                          {/* Search-before-assign toggle */}
                          <button
                            type="button"
                            onClick={() => togglePreview(row)}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium ${previewOpen ? "text-[#2c4a63] dark:text-[#6fa8d0]" : "text-[#4a6578] dark:text-[#8fb0c4]"} hover:underline`}
                          >
                            <Search size={11} /> {previewOpen ? "Hide" : "Check"} existing stock
                          </button>

                          {/* Batch-status explanatory notes for the two new
                              "can't be assigned" states. */}
                          {row.status === "pending_inspection" && (
                            <div className="text-[10px] italic text-[#5c3468] dark:text-[#c68fd4]">
                              Awaiting Material Inspection approval before this batch can be racked.
                            </div>
                          )}
                          {row.status === "rejected" && (
                            <div className="text-[10px] italic text-[#a04a3a]">
                              Rejected during inspection ({row.rejectedRoll} Roll / {row.rejectedYds} Yds) -- not available for stock.
                            </div>
                          )}

                          {/* Assign-more form, only while quantity remains unassigned */}
                          {!isLocked && (
                            <div className="space-y-1">
                              {/* Rack select on its own full-width row -- on
                                  narrow screens, squeezing this into a row
                                  alongside Roll, Yds and the Assign button
                                  left almost no width for it, so it rendered
                                  as just the browser's dropdown arrow with
                                  the selected rack name invisible. A visible
                                  "Rack" label + pin icon + full width fixes
                                  that and makes the current pick obvious. */}
                              <label className="block">
                                <span className="block mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#4a6578] dark:text-[#8fb0c4]">
                                  Rack
                                </span>
                                <div className="relative">
                                  <MapPin size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#2c4a63] dark:text-[#6fa8d0] pointer-events-none" />
                                  <select
                                    value={draft.location}
                                    onChange={(e) => setDraft(row.id, "location", e.target.value)}
                                    className={`${inputCls} w-full !pl-6 font-semibold text-[#2c4a63] dark:text-[#6fa8d0]`}
                                  >
                                    {RACK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number" placeholder="Roll" value={draft.roll}
                                  onChange={(e) => setDraft(row.id, "roll", e.target.value)}
                                  className={`${inputCls} flex-1`}
                                />
                                <input
                                  type="number" placeholder="Yds" value={draft.yds}
                                  onChange={(e) => setDraft(row.id, "yds", e.target.value)}
                                  className={`${inputCls} flex-1`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAssign(row)}
                                  disabled={assigningId === row.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#2c4a63] dark:bg-[#3d6a8a] text-white text-[10px] font-medium px-2.5 py-1.5 hover:bg-[#3d6a8a] dark:hover:bg-[#4a7a9a] transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {assigningId === row.id ? "..." : "Assign"}
                                </button>
                              </div>
                              <div className="text-[9px] text-[#a08060]">
                                Up to {row.unassignedRoll} Roll / {row.unassignedYds} Yds left to place. Assign part of it to split across racks — assigning to a Rack that already holds this batch merges into that same Rack instead of creating a duplicate.
                              </div>
                            </div>
                          )}
                          {rowError[row.id] && <div className="text-[10px] text-[#a04a3a]">{rowError[row.id]}</div>}
                        </div>
                      </td>
                    </tr>
                    {previewOpen && (
                      <tr className="bg-[#3d6a8a]/[0.06] dark:bg-[#6fa8d0]/[0.04]">
                        <td colSpan={8} className="px-3 py-2.5">
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
   (Invoice No., Buyer [dropdown], Supplier, PO, Style, Model, Item
  Code/PDM, Color, Fabric Details), all sitting on a single
   horizontally-scrollable line. Each field is sent to the backend
   as its own query param and matched only against its own column
   there, so "Item Code/PDM" never accidentally matches a "Color"
   value or vice versa.
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
            {f.type === "select" ? (
              <select
                value={filters[f.key]}
                onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
                className={`${inputCls} text-[11px] py-1`}
              >
                <option value="">All Buyers</option>
                {BUYERS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={filters[f.key]}
                onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.label}
                className={`${inputCls} text-[11px] py-1 ${i === 0 ? "pl-6" : ""}`}
              />
            )}
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
   Records panel -- a real HTML table, sits beside the form.
   Now includes a Supplier column (right after Buyer), truncated
   with an ellipsis and the full text available on hover via title,
   same treatment as Remark.
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
                <th className="px-3 py-2 text-left font-semibold">Remark</th>
                <th className="px-3 py-2 text-left font-semibold">From</th>
                <th className="px-3 py-2 text-left font-semibold">Warehouse</th>
                <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold">Supplier</th>
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
                      className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 cursor-pointer hover:bg-[#b87a4a]/5"
                    >
                      <td className="px-3 py-2 text-[#a08060]">
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-medium text-[#1a1208] dark:text-[#f0e8dc] whitespace-nowrap">{r.invoiceNo}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate text-[#7a6250] dark:text-[#a8917d]" title={r.remark || undefined}>
                        {r.remark || <span className="italic text-[#a08060]">-</span>}
                      </td>
                      <td className="px-3 py-2"><span className={chip}>{r.fromType}</span></td>
                      <td className="px-3 py-2"><span className={chip}>{r.warehouse}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.buyer}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate text-[#7a6250] dark:text-[#a8917d]" title={r.supplier || undefined}>
                        {r.supplier || <span className="italic text-[#a08060]">-</span>}
                      </td>
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
                      <td className="px-3 py-2">{statusChip(isApproved ? "approved" : "pending")}</td>
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

  // Each filter box is sent to the backend as its OWN query param
  // (invoiceNo=, buyer=, supplier=, po=, style=, model=, itemCodePdm=,
  // color=, fabricDetails=) and the backend matches each one only against its
  // own column (AND across whichever fields are filled in). This is what
  // fixes "Item Code/PDM = TEST-2" incorrectly matching a row whose Color
  // happens to be TEST-2.
  const fetchReceives = useCallback(async (filters = emptyRecordFilters) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v.trim()) params.set(k, v.trim());
      });
      const qs = params.toString();
      const url = qs ? `${API_URL}/material-receive?${qs}` : `${API_URL}/material-receive`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load material receives");
      setReceives(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReceives(); }, [fetchReceives]);
  useEffect(() => {
    const t = setTimeout(() => fetchReceives(recordFilters), 400);
    return () => clearTimeout(t);
  }, [recordFilters, fetchReceives]);

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
      ic.colors.filter((c) => c.color).map((c) => ({
        itemCodePdm: ic.itemCodePdm, color: c.color, fabricDetails: c.fabricDetails, rollQty: c.roll, yds: c.yds,
      }))
    );
    if (items.length === 0) { setError("Add at least one Item Code/PDM with a Color row."); return; }

    // Fabric Details is required for every Item Code/PDM + Color row.
    if (items.some((it) => !it.fabricDetails || !it.fabricDetails.trim())) {
      setError("Fabric Details is required for every Item Code/PDM + Color row.");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `${API_URL}/material-receive/${editingId}` : `${API_URL}/material-receive`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, styles, items }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to save material receive"); }
      setSuccess(editingId ? "Material receive updated." : "Material receive saved. It now awaits Material Inspection before it can be racked.");
      resetForm(); fetchReceives(recordFilters);
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
        warehouse: data.warehouse || "K-2", buyer: data.buyer || "", supplier: data.supplier || "",
        season: data.season || "", po: data.po || "",
        item: data.item || "", buy: data.buy || "", remark: data.remark || "",
      });

      setStyleRows(
        (data.styles || []).length
          ? data.styles.map((s) => ({ key: uid(), style: s.style, model: s.model || "" }))
          : [newStyleRow()]
      );

      const grouped = [];
      for (const row of data.items) {
        let g = grouped.find((g) => g.itemCodePdm === row.itemCodePdm);
        if (!g) { g = { key: uid(), itemCodePdm: row.itemCodePdm, colors: [] }; grouped.push(g); }
        g.colors.push({ key: uid(), color: row.color, fabricDetails: row.fabricDetails || "", roll: row.rollQty, yds: row.yds });
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
      setSuccess("Material receive deleted."); fetchReceives(recordFilters);
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
                Record incoming fabric/material invoices, grouped by Item Code/PDM and Color. Each batch first goes to
                Material Inspection for approval, then can be split across one or more Locations/Racks here.
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

          - Outer wrapper (per column) is `sticky` at `top-6`.
          - The RECORDS column now gets a *fixed* height
            (`h-[calc(100vh-3rem)]`) instead of only a `max-h-...`.
            `RecordsPanel` relies on `h-full` internally to size its
            own `flex-1 overflow-auto` table body -- and `height: 100%`
            can only resolve against an ancestor with a DEFINITE height.
            `max-height` alone leaves the computed height as `auto`,
            so `h-full` had nothing to measure against and the whole
            panel just grew with the table instead of scrolling. A
            fixed `h-[...]` fixes that.
          - The FORM column doesn't need this: it applies
            `overflow-y-auto` directly on itself with its own
            `max-h-...`, so `max-height` alone is fine there.
          - Both scroll regions use the shared `scrollThin` thin,
            theme-colored scrollbar instead of the browser default.

          Because each column's scroll container is separate, scrolling
          the form never moves the table and scrolling the table never
          moves the form -- and now the table actually scrolls once it
          gets long instead of pushing the page down.
        */}
        <div className="flex items-start gap-4">
          {/* FORM COLUMN */}
          <div
            className={`shrink-0 transition-all duration-300 ease-in-out ${
              formOpen ? "w-[340px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-6 pointer-events-none"
            }`}
          >
            <div className={`sticky top-6 w-[340px] max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden ${scrollHidden}`}>
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
                  <div className="col-span-2">
                    <Field text="Supplier">
                      <input
                        type="text"
                        value={form.supplier}
                        onChange={(e) => setForm({ ...form, supplier: up(e.target.value) })}
                        placeholder="Optional"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field text="Season" required><input type="text" required value={form.season} onChange={(e) => setForm({ ...form, season: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="PO" required><input type="text" required value={form.po} onChange={(e) => setForm({ ...form, po: up(e.target.value) })} className={inputCls} /></Field>
                  <Field text="Item" required><input type="text" required value={form.item} onChange={(e) => setForm({ ...form, item: up(e.target.value) })} className={inputCls} /></Field>
                  {/* Buy is now OPTIONAL -- no "required" prop on Field (no
                      asterisk) and no "required" attribute on the input, so
                      whoever wants to fill it in can, but it's no longer
                      mandatory to submit the form. */}
                  <Field text="Buy"><input type="text" value={form.buy} onChange={(e) => setForm({ ...form, buy: up(e.target.value) })} placeholder="Optional" className={inputCls} /></Field>

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

          {/* RECORDS COLUMN -- sticky + a FIXED viewport height (not just
              max-height), so RecordsPanel's h-full/flex-1 scroll region has
              something definite to size against and actually scrolls. */}
          <div className="flex-1 min-w-0 sticky top-6 h-[calc(100vh-3rem)] overflow-hidden">
            <RecordsPanel
              filters={recordFilters}
              setFilters={setRecordFilters}
              receives={receives}
              loading={loading}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAssigned={() => fetchReceives(recordFilters)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}