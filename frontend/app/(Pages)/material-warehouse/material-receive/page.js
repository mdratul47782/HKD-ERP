// frontend/app/(Pages)/material-warehouse/material-receive/page.js

"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, PackageSearch, ChevronDown, ChevronUp } from "lucide-react";

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

const emptyForm = {
  date: "", invoiceNo: "", fromType: "Overseas", warehouse: "K2",
  buyer: "", season: "", po: "", item: "", buy: "",
};
const newColor = () => ({ key: crypto.randomUUID(), color: "", roll: "", yds: "" });
const newItemCode = () => ({ key: crypto.randomUUID(), itemCodePdm: "", colors: [newColor()] });
const newStyleRow = () => ({ key: crypto.randomUUID(), style: "", model: "" });

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
          <input type="text" placeholder="Style" value={row.style} onChange={(e) => onChange(row.key, "style", e.target.value)} className={inputCls} />
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Model" value={row.model} onChange={(e) => onChange(row.key, "model", e.target.value)} className={`${inputCls} flex-1`} />
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
          onChange={(e) => onNameChange(e.target.value)} className={`${inputCls} flex-1`} />
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-[10px] font-medium text-[#b87a4a] hover:underline shrink-0">
            Remove
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {itemCode.colors.map((c) => (
          <div key={c.key} className="bg-white dark:bg-[#2a241b] border border-[#2c2417]/8 dark:border-[#e8ddd0]/8 rounded-md p-1.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <input type="text" placeholder="Color" value={c.color} onChange={(e) => onColorChange(c.key, "color", e.target.value)} className={`${inputCls} flex-1`} />
              {itemCode.colors.length > 1 && (
                <button type="button" onClick={() => onRemoveColor(c.key)} className="text-[10px] font-medium text-[#b87a4a] hover:underline shrink-0">
                  ×
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" placeholder="Roll" value={c.roll} onChange={(e) => onColorChange(c.key, "roll", e.target.value)} className={inputCls} />
              <input type="number" placeholder="Yds" value={c.yds} onChange={(e) => onColorChange(c.key, "yds", e.target.value)} className={inputCls} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={onAddColor} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#b87a4a] dark:text-[#d4955e] hover:underline">
        <Plus size={11} /> Add Color
      </button>
    </div>
  );
}

/* ============================================================
   Item Code / Color breakdown, rendered as a real sub-table
   ============================================================ */

function ItemsBreakdownTable({ items }) {
  if (!items?.length) {
    return <tr><td colSpan={12} className="px-3 py-2 text-[11px] italic text-[#a08060]">No item code / color rows found.</td></tr>;
  }
  return (
    <tr>
      <td colSpan={12} className="p-0 bg-[#e6e0d4]/30 dark:bg-white/[0.02]">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="text-[#7a6250] dark:text-[#a8917d] border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
              <th className="px-3 py-1.5 text-left font-medium w-1/4">Item Code / PDM</th>
              <th className="px-3 py-1.5 text-left font-medium">Color</th>
              <th className="px-3 py-1.5 text-left font-medium">Roll</th>
              <th className="px-3 py-1.5 text-left font-medium">Yds</th>
              <th className="px-3 py-1.5 text-left font-medium">Status</th>
              <th className="px-3 py-1.5 text-left font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id ?? row.key ?? `${row.itemCodePdm}-${row.color}`} className="border-b border-[#2c2417]/5 dark:border-[#e8ddd0]/5 last:border-b-0">
                <td className="px-3 py-1.5 text-[#8a4a24] dark:text-[#d4955e] font-medium">{row.itemCodePdm}</td>
                <td className="px-3 py-1.5">{row.color}</td>
                <td className="px-3 py-1.5">{row.rollQty}</td>
                <td className="px-3 py-1.5">{row.yds}</td>
                <td className="px-3 py-1.5">
                  <span className={row.status === "approved" ? chipApproved : chipPending}>
                    {row.status === "approved" ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="px-3 py-1.5">{row.location || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

/* ============================================================
   Records panel -- a real HTML table, sits beside the form
   ============================================================ */

function RecordsPanel({ search, setSearch, receives, loading, expandedIds, toggleExpanded, onEdit, onDelete }) {
  return (
    <div className={`${card} flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
        <PackageSearch size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Saved Records</h2>
        <span className="text-[11px] text-[#a08060]">({receives.length})</span>
      </div>

      <div className="px-4 py-2.5 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a08060]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, buyer, PO, style, model, item code, color..." className={`${inputCls} pl-8`} />
        </div>
      </div>

      <div className="flex-1 overflow-auto max-h-[70vh]">
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
        ) : receives.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-xs">No material receives found.</div>
        ) : (
          <table className="min-w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
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
                  <>
                    <tr
                      key={r.id}
                      onClick={() => toggleExpanded(r.id)}
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
                    {isOpen && <ItemsBreakdownTable key={`${r.id}-breakdown`} items={r.items} />}
                  </>
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
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  useEffect(() => { const t = setTimeout(() => fetchReceives(search), 400); return () => clearTimeout(t); }, [search, fetchReceives]);

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
      resetForm(); fetchReceives(search);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleEdit = async (id) => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/material-receive/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load material receive");
      const data = await res.json();
      setForm({
        date: data.date?.slice(0, 10) || "", invoiceNo: data.invoiceNo || "", fromType: data.fromType || "Overseas",
        warehouse: data.warehouse || "K2", buyer: data.buyer || "", season: data.season || "", po: data.po || "",
        item: data.item || "", buy: data.buy || "",
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this Material Receive? This cannot be undone.")) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/material-receive/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to delete material receive"); }
      setSuccess("Material receive deleted."); fetchReceives(search);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <PackageSearch size={22} className="text-[#b87a4a]" />
          <div>
            <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
              Material <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Receive</em>
            </h1>
            <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
              Record incoming fabric/material invoices, grouped by Item Code/PDM and Color. Location/Rack is assigned
              later on the Location Assignment page.
            </p>
          </div>
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}
        {success && <div className="rounded-lg bg-[#5ca068]/10 border border-[#5ca068]/25 text-[#3d7a4a] dark:text-[#8fca9c] text-xs px-3 py-2">{success}</div>}

        {/* FORM + RECORDS TABLE side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
          {/* FORM -- narrow, compact, table-like, 2 fields per row */}
          <form onSubmit={handleSubmit} className={`${card} p-3 space-y-3`}>
            <div>
              <h2 className="font-serif text-sm text-[#1a1208] dark:text-[#f0e8dc] mb-2 pb-1 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
                Receive Details
              </h2>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                <Field text="Date" required><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
                <Field text="Invoice No." required><input type="text" required value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className={inputCls} /></Field>
                <Field text="From" required>
                  <select value={form.fromType} onChange={(e) => setForm({ ...form, fromType: e.target.value })} className={inputCls}>
                    <option value="Overseas">Overseas</option><option value="Local">Local</option>
                  </select>
                </Field>
                <Field text="Warehouse" required>
                  <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} className={inputCls}>
                    <option value="K2">K2</option><option value="K1">K1</option><option value="K3">K3</option>
                  </select>
                </Field>
                <Field text="Buyer" required><input type="text" required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} className={inputCls} /></Field>
                <Field text="Season" required><input type="text" required value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className={inputCls} /></Field>
                <Field text="PO" required><input type="text" required value={form.po} onChange={(e) => setForm({ ...form, po: e.target.value })} className={inputCls} /></Field>
                <Field text="Item" required><input type="text" required value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} className={inputCls} /></Field>
                <Field text="Buy" required><input type="text" required value={form.buy} onChange={(e) => setForm({ ...form, buy: e.target.value })} className={inputCls} /></Field>

                <div className="col-span-2">
                  <Field text="Style + Model" required>
                    <StyleModelRows rows={styleRows} onAdd={addStyleRow} onRemove={removeStyleRow} onChange={updateStyleRow} />
                  </Field>
                </div>
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
              {editingId && <button type="button" onClick={resetForm} className={`${btnSecondary} w-full justify-center`}>Cancel Edit</button>}
            </div>
          </form>

          {/* RECORDS -- real table, sits beside the form */}
          <RecordsPanel
            search={search}
            setSearch={setSearch}
            receives={receives}
            loading={loading}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}