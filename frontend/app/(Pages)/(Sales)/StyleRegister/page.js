"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, RotateCcw, Send, ImagePlus, Copy, Trash2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const YEARS = ["2024", "2025", "2026", "2027"];
const SEASONS = ["SS-24", "AW-24", "SS-25", "AW-25", "SS-26", "AW-26"];
const PRODUCT_TYPES = ["Jacket", "Pant", "Shirt", "T-Shirt", "Fleece", "Vest", "Shorts", "Others"];
const STATUSES = ["Pending", "Approved", "In Production", "Completed", "Cancelled"];
const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-blue-100 text-blue-700",
  "In Production": "bg-indigo-100 text-indigo-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

// Field-driven form config — keeps the modal markup to one map() call.
const FIELDS = [
  { key: "customerName", label: "Customer Name", required: true },
  { key: "brand", label: "Brand" },
  { key: "styleName", label: "Style Name", required: true },
  { key: "styleNumber", label: "Style Number", required: true },
  { key: "model", label: "Model" },
  { key: "color", label: "Color" },
  { key: "productType", label: "Product Type", type: "select", options: PRODUCT_TYPES },
  { key: "status", label: "Status", type: "select", options: STATUSES },
  { key: "qty", label: "Order Qty", type: "number", createOnly: true },
  { key: "description", label: "Description", type: "textarea" },
];

// Table columns — `responsive` hides a column below md so the table shrinks
// on smaller screens instead of forcing horizontal scroll.
const COLUMNS = [
  { key: "image", label: "Image" },
  { key: "styleName", label: "Style Name" },
  { key: "styleNumber", label: "Style Number" },
  { key: "customerName", label: "Customer Name" },
  { key: "brand", label: "Brand", responsive: true },
  { key: "color", label: "Color", responsive: true },
  { key: "season", label: "Season", responsive: true },
  { key: "productType", label: "Product Type", responsive: true },
  { key: "releases", label: "Order Releases" },
  { key: "total", label: "Total" },
  { key: "status", label: "Status" },
  { key: "updated", label: "Updated", responsive: true },
  { key: "active", label: "Active", responsive: true },
  { key: "actions", label: "Actions" },
];

const emptyForm = () => ({
  customerName: "", brand: "", styleName: "", styleNumber: "",
  model: "", color: "", seasonYear: "2026", season: "SS-26",
  productType: "", status: "Pending", qty: "", description: "", images: [],
});

const toFormShape = (s) => ({
  customerName: s.customer_name || "", brand: s.brand || "",
  styleName: s.style_name || "", styleNumber: s.style_number || "",
  model: s.model || "", color: s.color || "",
  seasonYear: s.season_year || "2026", season: s.season || "SS-26",
  productType: s.product_type || "", status: s.status || "Pending",
  qty: "", description: s.description || "",
  images: (s.images || []).map((url, i) => ({ id: `x-${i}`, url })),
});

const fmt = (v) =>
  v && !Number.isNaN(new Date(v).getTime())
    ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const input = "w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm outline-none transition-colors focus:border-[#3B9ED4] focus:ring-2 focus:ring-[#3B9ED4]/20 placeholder:text-gray-400 placeholder:uppercase placeholder:text-xs";
const td = "border-b border-gray-100 px-2 py-2 text-center text-[11px] sm:px-3 sm:py-3 sm:text-xs";
const respCell = "hidden md:table-cell";

export default function StyleRegisterPage() {
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  // --- Order releases (batch tracking) state ---
  const [releases, setReleases] = useState([]);
  const [newReleaseQty, setNewReleaseQty] = useState("");
  const [addingRelease, setAddingRelease] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingReleaseId, setEditingReleaseId] = useState(null);
  const [editReleaseQty, setEditReleaseQty] = useState("");
  const [savingReleaseId, setSavingReleaseId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/styles`)
      .then((r) => r.json())
      .then(setStyles)
      .catch(() => setError("Failed to load styles."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return styles.filter((s) =>
      !q || [s.style_name, s.style_number, s.customer_name, s.season, s.product_type]
        .join(" ").toLowerCase().includes(q)
    );
  }, [styles, search]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    const withData = await Promise.all(
      files.map(async (file) => ({ id: crypto.randomUUID(), url: await fileToDataUrl(file) }))
    );
    set("images", [...form.images, ...withData]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setReleases([]);
    setNewReleaseQty("");
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm(toFormShape(s));
    setReleases(s.releases || []);
    setNewReleaseQty("");
    setEditingReleaseId(null);
    setEditReleaseQty("");
    setOpen(true);
  };

  // Starts a brand-new style pre-filled from an existing one — this is how
  // the same style can be registered again as a fresh entry. Style Number
  // is unique in the DB, so it's left blank and must be given a new value;
  // everything else carries over as a starting point. editingId stays null
  // so Submit creates a new row rather than overwriting the original.
  const openDuplicate = (s) => {
    setEditingId(null);
    setForm({ ...toFormShape(s), styleNumber: "", qty: "" });
    setReleases([]);
    setNewReleaseQty("");
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setReleases([]);
    setNewReleaseQty("");
    setEditingReleaseId(null);
    setEditReleaseQty("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.styleName || !form.styleNumber) return;
    const isEdit = editingId !== null;

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        customerName: form.customerName, brand: form.brand, styleName: form.styleName,
        styleNumber: form.styleNumber, description: form.description, model: form.model,
        color: form.color, seasonYear: form.seasonYear, season: form.season,
        productType: form.productType, status: form.status,
        images: form.images.map((i) => i.url),
        ...(isEdit ? {} : { qty: form.qty || undefined }),
      };
      const res = await fetch(`${API_BASE}/styles${isEdit ? `/${editingId}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Save failed.");
      const saved = await res.json();
      setStyles((prev) => (isEdit ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]));
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id) => {
    setStyles((p) => p.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
    const res = await fetch(`${API_BASE}/styles/${id}/toggle-active`, { method: "PATCH" }).catch(() => null);
    if (!res?.ok) {
      setStyles((p) => p.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
      setError("Failed to toggle status.");
    }
  };

  // Logs a new batch/release against the style currently being edited.
  // Hits its own endpoint so it's saved immediately, independent of the
  // "Save Changes" button — no need to resubmit the whole form.
  const handleAddRelease = async () => {
    if (!editingId || !newReleaseQty || Number(newReleaseQty) <= 0) return;
    try {
      setAddingRelease(true);
      setError(null);
      const res = await fetch(`${API_BASE}/styles/${editingId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: Number(newReleaseQty) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to add release.");
      const release = await res.json();
      setReleases((r) => [release, ...r]);
      setStyles((prev) =>
        prev.map((s) =>
          s.id === editingId ? { ...s, releases: [release, ...(s.releases || [])] } : s
        )
      );
      setNewReleaseQty("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingRelease(false);
    }
  };

  const startEditRelease = (r) => {
    setEditingReleaseId(r.id);
    setEditReleaseQty(String(r.qty));
  };

  const cancelEditRelease = () => {
    setEditingReleaseId(null);
    setEditReleaseQty("");
  };

  // Saves a corrected qty for a past release, hitting its own PUT endpoint.
  const saveEditRelease = async (releaseId) => {
    if (!editReleaseQty || Number(editReleaseQty) <= 0) return;
    try {
      setSavingReleaseId(releaseId);
      setError(null);
      const res = await fetch(`${API_BASE}/styles/${editingId}/release/${releaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: Number(editReleaseQty) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to update release.");
      const updated = await res.json();
      setReleases((r) => r.map((rel) => (rel.id === releaseId ? updated : rel)));
      setStyles((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? { ...s, releases: (s.releases || []).map((rel) => (rel.id === releaseId ? updated : rel)) }
            : s
        )
      );
      cancelEditRelease();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingReleaseId(null);
    }
  };

  // Removes a single mistaken release entry.
  const handleDeleteRelease = async (releaseId) => {
    const ok = window.confirm("Delete this release entry?");
    if (!ok) return;
    const prevReleases = releases;
    setReleases((r) => r.filter((rel) => rel.id !== releaseId));
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/styles/${editingId}/release/${releaseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to delete release.");
      setStyles((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? { ...s, releases: (s.releases || []).filter((rel) => rel.id !== releaseId) }
            : s
        )
      );
    } catch (err) {
      setReleases(prevReleases);
      setError(err.message);
    }
  };

  // Deletes a style permanently — confirms first since this also removes
  // its releases and Cloudinary images on the backend (see deleteStyle).
  const handleDelete = async (s) => {
    const ok = window.confirm(
      `Delete "${s.style_name}" (${s.style_number})? This also removes its logged order releases and cannot be undone.`
    );
    if (!ok) return;

    const prevStyles = styles;
    setDeletingId(s.id);
    setStyles((prev) => prev.filter((x) => x.id !== s.id));

    try {
      setError(null);
      const res = await fetch(`${API_BASE}/styles/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Delete failed.");
    } catch (err) {
      setStyles(prevStyles); // roll back the optimistic removal
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#3B9ED4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2E8EC4]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Style Register
        </button>
        <div className="relative w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-xs uppercase tracking-widest text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#3B9ED4] focus:ring-2 focus:ring-[#3B9ED4]/20"
            placeholder="Search Style..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>}

      {/* Table — no min-width, so columns shrink with the viewport instead of scrolling */}
      <div className="p-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-[#C8E3F5]">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={`border-b border-[#A8D3EC] px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 sm:px-3 sm:py-3.5 sm:text-xs ${c.responsive ? respCell : ""}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLUMNS.length} className="py-16 text-center text-sm text-gray-400">Loading styles…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="py-16 text-center text-sm text-gray-400">No styles found.</td></tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-[#EEF6FC]"}>
                    <td className={td}>
                      <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-gray-300 sm:h-12 sm:w-12">
                        {s.image ? <img src={s.image} alt="" className="h-full w-full object-contain" /> : <ImagePlus size={14} />}
                      </div>
                    </td>
                    <td className={`${td} font-semibold uppercase tracking-wide text-gray-800 truncate`}>{s.style_name}</td>
                    <td className={`${td} uppercase tracking-wide text-gray-700 truncate`}>{s.style_number}</td>
                    <td className={`${td} uppercase tracking-wide text-gray-700 truncate`}>{s.customer_name}</td>
                    <td className={`${td} ${respCell} uppercase tracking-wide text-gray-700 truncate`}>{s.brand || "—"}</td>
                    <td className={`${td} ${respCell} uppercase tracking-wide text-gray-700 truncate`}>{s.color || "—"}</td>
                    <td className={`${td} ${respCell} font-semibold uppercase text-gray-700`}>{s.season}</td>
                    <td className={`${td} ${respCell} uppercase tracking-wide text-gray-700 truncate`}>{s.product_type || "—"}</td>
                    <td className={td}>
                      {(s.releases || []).length > 0 ? (
                        <ul className="space-y-1">
                          {s.releases.map((r) => (
                            <li key={r.id} className="flex flex-wrap items-center justify-center gap-1 text-[10px] sm:text-xs">
                              <span className="font-mono font-semibold text-gray-800">{Number(r.qty).toLocaleString()} pcs</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500">{fmt(r.release_date)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`${td} font-mono font-semibold text-gray-800`}>
                      {(s.releases || []).reduce((sum, r) => sum + (Number(r.qty) || 0), 0).toLocaleString()}
                    </td>
                    <td className={td}>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                    </td>
                    <td className={`${td} ${respCell} text-gray-500`}>{fmt(s.updated_at)}</td>
                    <td className={`${td} ${respCell}`}>
                      <button
                        onClick={() => toggleActive(s.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors sm:h-6 sm:w-11 ${s.is_active ? "bg-[#3B9ED4]" : "bg-gray-300"}`}
                      >
                        <span
                          className="inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform sm:h-[18px] sm:w-[18px]"
                          style={{ transform: s.is_active ? "translateX(18px)" : "translateX(3px)" }}
                        />
                      </button>
                    </td>
                    <td className={td}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          title="Edit"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:border-[#3B9ED4] hover:text-[#3B9ED4] sm:h-8 sm:w-8"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => openDuplicate(s)}
                          title="Register again (duplicate as new style)"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:border-[#3B9ED4] hover:text-[#3B9ED4] sm:h-8 sm:w-8"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          title="Delete"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 sm:h-8 sm:w-8"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-right text-xs text-gray-400">Showing {filtered.length} of {styles.length} styles</div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-7 py-5">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Style" : "Style Register"}</h2>
              <button type="button" onClick={close} className="p-1 text-gray-400 transition-colors hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="space-y-5 px-7 py-6">
              {FIELDS.filter((f) => !(f.createOnly && editingId)).map((f) => (
                <div key={f.key} className="flex items-start gap-4">
                  <div className="w-40 shrink-0 pt-2.5 text-sm font-semibold text-gray-800">{f.label} :</div>
                  <div className="flex-1">
                    {f.type === "select" ? (
                      <select className={input + " cursor-pointer"} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                        {f.key === "productType" && <option value="">--Select--</option>}
                        {f.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea className={input + " resize-none"} rows={3} placeholder={`Enter ${f.label}...`} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                    ) : (
                      <input
                        type={f.type || "text"}
                        min={f.type === "number" ? 0 : undefined}
                        className={input}
                        placeholder={`Enter ${f.label}...`}
                        value={form[f.key]}
                        required={f.required}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-4">
                <div className="w-40 shrink-0 pt-2.5 text-sm font-semibold text-gray-800">Season :</div>
                <div className="flex flex-1 gap-3">
                  <select className={input + " cursor-pointer"} value={form.seasonYear} onChange={(e) => set("seasonYear", e.target.value)}>
                    {YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <select className={input + " cursor-pointer"} value={form.season} onChange={(e) => set("season", e.target.value)}>
                    {SEASONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-40 shrink-0 pt-2.5 text-sm font-semibold text-gray-800">Images :</div>
                <div className="flex-1 space-y-2">
                  <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-[#3B9ED4] hover:bg-[#EEF6FC] hover:text-[#3B9ED4]">
                    <ImagePlus size={20} />
                    <span className="mt-1.5 text-xs">Click to upload style images</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                  </label>
                  {form.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img) => <img key={img.id} src={img.url} alt="" className="h-12 w-12 rounded-md border border-gray-200 object-cover" />)}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Releases — batch-by-batch qty tracking, only once the style exists */}
              {editingId && (
                <div className="flex items-start gap-4">
                  <div className="w-40 shrink-0 pt-2.5 text-sm font-semibold text-gray-800">Order Releases :</div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        className={input}
                        placeholder="Enter Qty..."
                        value={newReleaseQty}
                        onChange={(e) => setNewReleaseQty(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddRelease}
                        disabled={addingRelease || !newReleaseQty}
                        className="shrink-0 rounded-lg bg-[#3B9ED4] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2E8EC4] disabled:opacity-60"
                      >
                        {addingRelease ? "Adding…" : "Add"}
                      </button>
                    </div>

                    {releases.length > 0 ? (
                      <ul className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        {releases.map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                            {editingReleaseId === r.id ? (
                              <>
                                <input
                                  type="number"
                                  min={1}
                                  autoFocus
                                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#3B9ED4] focus:ring-1 focus:ring-[#3B9ED4]/30"
                                  value={editReleaseQty}
                                  onChange={(e) => setEditReleaseQty(e.target.value)}
                                />
                                <span className="flex-1 truncate">{fmt(r.release_date)}</span>
                                <button
                                  type="button"
                                  onClick={() => saveEditRelease(r.id)}
                                  disabled={savingReleaseId === r.id || !editReleaseQty}
                                  className="font-semibold text-[#3B9ED4] hover:text-[#2E8EC4] disabled:opacity-50"
                                >
                                  {savingReleaseId === r.id ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditRelease}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-mono font-semibold text-gray-800">{Number(r.qty).toLocaleString()} pcs</span>
                                <span className="flex-1 truncate text-right">{fmt(r.release_date)}</span>
                                <button
                                  type="button"
                                  onClick={() => startEditRelease(r)}
                                  title="Edit qty"
                                  className="text-gray-900 transition-colors hover:text-[#3B9ED4]"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRelease(r.id)}
                                  title="Delete release"
                                  className="text-gray-400 transition-colors hover:text-rose-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">No releases logged yet.</p>
                    )}

                    <p className="text-xs text-gray-400">
                      Total: {releases.reduce((sum, r) => sum + Number(r.qty), 0).toLocaleString()} pcs
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-5">
              <button type="button" onClick={() => setForm(emptyForm())} className="flex items-center gap-2 rounded-lg border-2 border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                <RotateCcw size={14} />
                Reset
              </button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-lg bg-[#3B9ED4] px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2E8EC4] disabled:opacity-60">
                <Send size={14} />
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}