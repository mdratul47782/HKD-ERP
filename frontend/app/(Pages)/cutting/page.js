// frontend/app/(Pages)/cutting/page.js

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/app/provider/SidebarContext";
import { useDarkMode } from "@/app/provider/DarkModeProvider";
import {
  Scissors, AlertCircle, CheckCircle2,
  Calendar, Building2, Plus, Pencil, Trash2,
  X, ChevronDown, ChevronUp, Save, Copy,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ALL_SIZES = [
  "34","36","38","40","42","44","46","48","50","52","54",
  "EU40","EU42","EU44","EU46","EU48","EU50",
  "XS","S","M","L","XL","2XL","3XL","4XL",
  "2-3","3-4","4-5","5-6","6-7","7-8","8-9","9-10","10-11","11-12","12-13","13-14","14-15",
  "52-56","57-60","6-8","8-10","10-12","12-14","14-16","16-18",
  "6M","12M","18M","24M","ONE SIZE","ADULT",
];

const LINES = Array.from({ length: 19 }, (_, i) => `Line-${i + 1}`);
const fmt   = (n) => Number(n || 0).toLocaleString();
const emptyForm = () => ({
  style: "", color: "", model: "", buyer: "", item: "",
  selectedSizes: [], size_quantities: {},
});

export default function CuttingEntriesPage() {
  const { user }      = useAuth();
  const { expanded }  = useSidebar();
  const { dark }      = useDarkMode();

  const [workDate,      setWorkDate]      = useState(new Date().toISOString().split("T")[0]);
  const [selLine,       setSelLine]       = useState("Line 1");
  const [entries,       setEntries]       = useState([]);
  const [prevEntries,   setPrevEntries]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [form,          setForm]          = useState(emptyForm());
  const [editId,        setEditId]        = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [expandedLines, setExpandedLines] = useState({});

  // ── fetch entries ──────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!user || !workDate) return;
    setLoading(true);
    try {
      const res  = await fetch(
        `${API_URL}/cutting/entries?factory=${encodeURIComponent(user.factory)}&building=${encodeURIComponent(user.assigned_building)}&date=${workDate}`
      );
      const data = await res.json();
      if (res.ok) setEntries(data.entries || []);
    } catch { /**/ } finally { setLoading(false); }
  }, [user, workDate]);

  const fetchPrevEntries = useCallback(async () => {
    if (!user || !workDate) return;
    const base = new Date(workDate);
    for (let d = 1; d <= 14; d++) {
      const prev = new Date(base);
      prev.setDate(base.getDate() - d);
      const ds = prev.toISOString().split("T")[0];
      try {
        const res  = await fetch(
          `${API_URL}/cutting/entries?factory=${encodeURIComponent(user.factory)}&building=${encodeURIComponent(user.assigned_building)}&date=${ds}`
        );
        const data = await res.json();
        if (res.ok && (data.entries || []).length > 0) {
          setPrevEntries(data.entries); break;
        }
      } catch { /**/ }
    }
  }, [user, workDate]);

  useEffect(() => { fetchEntries(); },     [fetchEntries]);
  useEffect(() => { fetchPrevEntries(); }, [fetchPrevEntries]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error)   { const t = setTimeout(() => setError(""),   4500); return () => clearTimeout(t); } }, [error]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const toggleSize = (sz) => setForm(f => {
    const sel = f.selectedSizes.includes(sz)
      ? f.selectedSizes.filter(s => s !== sz)
      : [...f.selectedSizes, sz];
    const sq = { ...f.size_quantities };
    if (!sel.includes(sz)) delete sq[sz];
    return { ...f, selectedSizes: sel, size_quantities: sq };
  });

  const prefillFrom = (e) => setForm(f => ({
    ...f,
    style: e.style || "", color: e.color || "",
    model: e.model || "", buyer: e.buyer || "", item: e.item || "",
  }));

  const openNew = () => {
    const ref = prevEntries.find(e => e.line === selLine);
    if (ref) {
      setForm({ style: ref.style || "", color: ref.color || "", model: ref.model || "",
        buyer: ref.buyer || "", item: ref.item || "", selectedSizes: [], size_quantities: {} });
    } else { setForm(emptyForm()); }
    setEditId(null); setShowForm(true);
  };

  const openEdit = (e) => {
    setForm({
      style: e.style || "", color: e.color || "", model: e.model || "",
      buyer: e.buyer || "", item: e.item || "",
      selectedSizes: Object.keys(e.size_quantities || {}),
      size_quantities: { ...(e.size_quantities || {}) },
    });
    setEditId(e.id); setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()); setError(""); };

  const totalPcs = form.selectedSizes.reduce((s, sz) => s + Number(form.size_quantities[sz] || 0), 0);

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!form.style || !form.color || !form.model || !form.buyer) return setError("Style, Color, Model এবং Buyer দিন।");
    if (!form.selectedSizes.length) return setError("অন্তত একটি Size select করুন।");
    if (totalPcs === 0) return setError("কমপক্ষে একটি size এ quantity দিন।");

    const sq = Object.fromEntries(
      form.selectedSizes.filter(sz => Number(form.size_quantities[sz] || 0) > 0).map(sz => [sz, Number(form.size_quantities[sz])])
    );
    if (!Object.keys(sq).length) return setError("কমপক্ষে একটি size এ quantity দিন।");

    setSaving(true);
    try {
      const url    = editId ? `${API_URL}/cutting/entries/${editId}` : `${API_URL}/cutting/entries`;
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factory: user.factory, assigned_building: user.assigned_building,
          work_date: workDate, line: selLine,
          style: form.style, color: form.color, model: form.model,
          buyer: form.buyer, item: form.item,
          size_quantities: sq, created_by: user.user_name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(editId ? "Entry আপডেট হয়েছে!" : "Entry সেভ হয়েছে!");
      closeForm(); fetchEntries();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("এই entry মুছে ফেলবেন?")) return;
    try {
      const res = await fetch(`${API_URL}/cutting/entries/${id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factory: user.factory, assigned_building: user.assigned_building }),
      });
      if (res.ok) { setSuccess("Entry মুছে ফেলা হয়েছে।"); fetchEntries(); }
      else setError("Delete failed.");
    } catch { setError("Delete failed."); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const byLine      = {};
  for (const e of entries) { if (!byLine[e.line]) byLine[e.line] = []; byLine[e.line].push(e); }
  const lineTotals  = Object.fromEntries(Object.entries(byLine).map(([l, es]) => [l, es.reduce((s, e) => s + Number(e.total_pcs || 0), 0)]));
  const lineEntries = entries.filter(e => e.line === selLine);
  const lineTotal   = lineEntries.reduce((s, e) => s + Number(e.total_pcs || 0), 0);
  const dayTotal    = entries.reduce((s, e) => s + Number(e.total_pcs || 0), 0);
  const prevLine    = prevEntries.filter(e => e.line === selLine);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] dark:bg-[#1a1a1a]">
      <p className="text-sm text-slate-400 dark:text-[#888]">Please log in.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#1a1a1a] text-slate-700 dark:text-[#c8d8e8] font-sans">

      {/* ── TOPBAR ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 h-[54px]
                      bg-white/95 dark:bg-[#1a1a1a]/97
                      border-b border-slate-200/80 dark:border-white/[0.08]
                      backdrop-blur-md">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center
                          bg-slate-100 dark:bg-white/[0.06]
                          border border-slate-200 dark:border-white/[0.1]">
            <Scissors size={14} className="text-slate-500 dark:text-[#aaa]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-800 dark:text-[#ececec] leading-none">
              Cutting Input
            </p>
            <p className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#888] mt-0.5">
              <Building2 size={9} />
              {user.factory} · {user.assigned_building}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {dayTotal > 0 && (
            <span className="font-mono text-[12px] font-medium text-slate-500 dark:text-[#aaa]">
              {fmt(dayTotal)} pcs today
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                          bg-slate-100 dark:bg-white/[0.05]
                          border border-slate-200 dark:border-white/[0.09]
                          text-slate-600 dark:text-[#bbb]">
            <Calendar size={11} />
            {workDate}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-[1200px] mx-auto px-5 py-7 pb-20
                      grid grid-cols-1 md:grid-cols-[390px_1fr] gap-6 items-start">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div>

          {/* Flash messages */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl text-[12px] font-medium
                            bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40
                            text-red-600 dark:text-red-400 animate-[fadeUp_.2s_ease]">
              <AlertCircle size={13} className="flex-shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl text-[12px] font-medium
                            bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40
                            text-emerald-600 dark:text-emerald-400 animate-[fadeUp_.2s_ease]">
              <CheckCircle2 size={13} className="flex-shrink-0" />{success}
            </div>
          )}

          {/* Step 1 Card */}
          <div className="mb-4 rounded-2xl overflow-hidden border
                          bg-white dark:bg-[#252525]
                          border-slate-200/80 dark:border-white/[0.08]
                          shadow-sm dark:shadow-none">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.07]
                            bg-slate-50/60 dark:bg-white/[0.02]">
              <span className="inline-block text-[9px] font-bold tracking-widest uppercase
                               px-2.5 py-0.5 rounded-full mb-1
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-500 dark:text-[#888]
                               border border-slate-200 dark:border-white/[0.08]">
                Step 1
              </span>
              <p className="text-[13px] font-semibold text-slate-800 dark:text-[#ececec]">Date &amp; Line</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest
                                  text-slate-500 dark:text-[#888] mb-1.5">Work Date</label>
                <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)}
                  className="ct-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest
                                  text-slate-500 dark:text-[#888] mb-1.5">Line</label>
                <select value={selLine} onChange={e => setSelLine(e.target.value)} className="ct-input w-full">
                  {LINES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Previous day strip */}
          {prevLine.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap px-3 py-2.5 mb-4 rounded-xl
                            bg-slate-50 dark:bg-white/[0.02]
                            border border-slate-200 dark:border-white/[0.07]">
              <span className="text-[9.5px] font-bold tracking-widest uppercase
                               text-slate-400 dark:text-[#666] flex-shrink-0">আগের দিন ·</span>
              {prevLine.slice(0, 5).map(e => (
                <button key={e.id}
                  onClick={() => { prefillFrom(e); setEditId(null); setShowForm(true); }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]
                             bg-white dark:bg-white/[0.04]
                             border border-slate-200 dark:border-white/[0.09]
                             text-slate-600 dark:text-[#aaa]
                             hover:border-slate-300 dark:hover:border-white/[0.18]
                             hover:text-slate-800 dark:hover:text-[#ececec]
                             transition-all">
                  <Copy size={9} />{e.style}
                </button>
              ))}
            </div>
          )}

          {/* Line header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-semibold text-slate-800 dark:text-[#ececec]">{selLine}</h2>
              {lineTotal > 0 && (
                <span className="font-mono text-[11px] font-medium px-2.5 py-0.5 rounded-full
                                 bg-slate-100 dark:bg-white/[0.06]
                                 border border-slate-200 dark:border-white/[0.1]
                                 text-slate-600 dark:text-[#bbb]">
                  {fmt(lineTotal)} pcs
                </span>
              )}
            </div>
            <button onClick={openNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium
                         bg-slate-800 dark:bg-[#e0e0e0]
                         text-white dark:text-[#1a1a1a]
                         hover:bg-slate-700 dark:hover:bg-white
                         border border-transparent
                         transition-all hover:-translate-y-px active:scale-[.98]">
              <Plus size={13} /> Add Entry
            </button>
          </div>

          {/* Entries list */}
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-[#444]
                              border-t-slate-500 dark:border-t-[#aaa] animate-spin" />
              <p className="text-[11px] text-slate-400 dark:text-[#666]">Loading…</p>
            </div>
          ) : lineEntries.length === 0 ? (
            <div className="text-center py-10">
              <Scissors size={28} className="mx-auto mb-2 text-slate-200 dark:text-[#3a3a3a]" />
              <p className="text-[13px] font-medium text-slate-400 dark:text-[#666]">{selLine} এ কোনো entry নেই</p>
              <p className="text-[11px] text-slate-300 dark:text-[#444] mt-0.5">"Add Entry" বাটনে ক্লিক করুন।</p>
            </div>
          ) : lineEntries.map(entry => (
            <div key={entry.id}
              className="mb-2.5 rounded-xl overflow-hidden
                         bg-white dark:bg-[#252525]
                         border border-slate-200/80 dark:border-white/[0.07]
                         hover:border-slate-300 dark:hover:border-white/[0.14]
                         shadow-sm dark:shadow-none transition-all">

              {/* Entry header: style + actions */}
              <div className="flex items-start justify-between px-4 py-3 gap-2">
                <div className="min-w-0 flex-1">
                  {/* Row 1: Style No. */}
                  <p className="font-mono text-[12.5px] font-semibold text-slate-800 dark:text-[#ececec]">
                    {entry.style}
                  </p>
                  {/* Row 2: Buyer · Model */}
                  <p className="text-[11px] text-slate-600 dark:text-[#b0b8c4] mt-0.5">
                    {entry.buyer}{entry.model ? ` · ${entry.model}` : ""}
                  </p>
                  {/* Row 3: Color · Item (if present) */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {entry.color && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px]
                                       bg-slate-50 dark:bg-white/[0.05]
                                       border border-slate-100 dark:border-white/[0.09]
                                       text-slate-600 dark:text-[#b0b8c4]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: "currentColor", opacity: 0.4 }} />
                        {entry.color}
                      </span>
                    )}
                    {entry.item && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px]
                                       bg-slate-50 dark:bg-white/[0.05]
                                       border border-slate-100 dark:border-white/[0.09]
                                       text-slate-600 dark:text-[#b0b8c4]">
                        {entry.item}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  <button onClick={() => openEdit(entry)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px]
                               border border-slate-200 dark:border-white/[0.1]
                               text-slate-400 dark:text-[#888]
                               hover:border-slate-400 dark:hover:border-white/[0.25]
                               hover:text-slate-600 dark:hover:text-[#ececec]
                               hover:bg-slate-50 dark:hover:bg-white/[0.06]
                               transition-all">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px]
                               border border-slate-200 dark:border-white/[0.1]
                               text-slate-400 dark:text-[#888]
                               hover:border-red-300 dark:hover:border-red-700/60
                               hover:text-red-500 dark:hover:text-red-400
                               hover:bg-red-50 dark:hover:bg-red-950/20
                               transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Size chips */}
              <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                {Object.entries(entry.size_quantities || {}).map(([sz, qty]) => (
                  <span key={sz}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                               bg-slate-50 dark:bg-white/[0.05]
                               border border-slate-100 dark:border-white/[0.09]
                               font-mono text-[10.5px] text-slate-500 dark:text-[#999]">
                    {sz} <span className="text-slate-700 dark:text-[#ddd] font-medium">{fmt(qty)}</span>
                  </span>
                ))}
              </div>

              {/* Total footer */}
              <div className="flex items-center justify-between px-4 py-2
                              border-t border-slate-100 dark:border-white/[0.06]
                              bg-slate-50/60 dark:bg-white/[0.02]">
                <span className="text-[10.5px] text-slate-500 dark:text-[#888]">Total</span>
                <span className="font-mono text-[12.5px] font-medium text-slate-700 dark:text-[#e0e0e0]">
                  {fmt(entry.total_pcs)} pcs
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ══ RIGHT COLUMN — Day Summary ═══════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-5 flex-wrap">
            <h2 className="text-[17px] font-semibold text-slate-800 dark:text-[#ececec]">
              {workDate
                ? new Date(workDate + "T00:00:00").toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                : "Today"}
            </h2>
            {entries.length > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full
                               bg-slate-100 dark:bg-white/[0.05]
                               border border-slate-200 dark:border-white/[0.08]
                               text-slate-500 dark:text-[#999]">
                {entries.length} entr{entries.length > 1 ? "ies" : "y"}
              </span>
            )}
          </div>

          {!loading && Object.keys(byLine).length === 0 ? (
            <div className="text-center py-10">
              <Calendar size={28} className="mx-auto mb-2 text-slate-200 dark:text-[#3a3a3a]" />
              <p className="text-[13px] font-medium text-slate-400 dark:text-[#666]">এই দিনে কোনো data নেই</p>
            </div>
          ) : Object.entries(byLine).map(([line, ents]) => {
            const isOpen = expandedLines[line] !== false;
            return (
              <div key={line}
                className="mb-3 rounded-xl overflow-hidden
                           bg-white dark:bg-[#252525]
                           border border-slate-200/80 dark:border-white/[0.07]
                           hover:border-slate-300 dark:hover:border-white/[0.14]
                           shadow-sm dark:shadow-none transition-all">
                <button
                  onClick={() => setExpandedLines(p => ({ ...p, [line]: !isOpen }))}
                  className="w-full flex items-center justify-between px-4 py-3
                             hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left">
                  <span className="flex items-center gap-2.5 text-[12px] font-semibold text-slate-700 dark:text-[#ccc]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 flex-shrink-0" />
                    {line}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 dark:text-[#777]">
                      {ents.length} entr{ents.length > 1 ? "ies" : "y"}
                    </span>
                    <span className="font-mono text-[12px] font-medium text-slate-700 dark:text-[#ddd]">
                      {fmt(lineTotals[line])} pcs
                    </span>
                    {isOpen
                      ? <ChevronUp size={12} className="text-slate-400 dark:text-[#777]" />
                      : <ChevronDown size={12} className="text-slate-400 dark:text-[#777]" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-white/[0.06]">
                    {ents.map(e => (
                      <div key={e.id}
                        className="px-4 py-3 border-b border-slate-50 dark:border-white/[0.04] last:border-b-0">

                        {/* Top row: style + total */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            {/* Style No. */}
                            <span className="font-mono text-[11.5px] font-semibold text-slate-700 dark:text-[#ddd]">
                              {e.style}
                            </span>
                            {/* Buyer · Model · Color · Item */}
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                              {e.buyer && (
                                <span className="text-[10.5px] text-slate-600 dark:text-[#b0b8c4]">{e.buyer}</span>
                              )}
                              {e.model && (
                                <>
                                  <span className="text-slate-300 dark:text-[#444]">·</span>
                                  <span className="text-[10.5px] text-slate-600 dark:text-[#b0b8c4]">{e.model}</span>
                                </>
                              )}
                              {e.color && (
                                <>
                                  <span className="text-slate-300 dark:text-[#444]">·</span>
                                  <span className="text-[10.5px] text-slate-500 dark:text-[#9aa8b8]">{e.color}</span>
                                </>
                              )}
                              {e.item && (
                                <>
                                  <span className="text-slate-300 dark:text-[#444]">·</span>
                                  <span className="text-[10.5px] text-slate-500 dark:text-[#9aa8b8] italic">{e.item}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-[12px] font-semibold text-slate-700 dark:text-[#ddd] flex-shrink-0">
                            {fmt(e.total_pcs)}
                          </span>
                        </div>

                        {/* Size chips row */}
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(e.size_quantities || {}).map(([sz, qty]) => (
                            <span key={sz}
                              className="font-mono text-[9.5px] px-1.5 py-0.5 rounded
                                         bg-slate-50 dark:bg-white/[0.05]
                                         border border-slate-100 dark:border-white/[0.08]
                                         text-slate-500 dark:text-[#aaa]">
                              {sz}:<span className="text-slate-700 dark:text-[#ddd]">{fmt(qty)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5
                     bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={closeForm}>
          <div
            className="relative w-full max-w-[500px] max-h-[90vh] flex flex-col
                       bg-white dark:bg-[#252525]
                       border border-slate-200 dark:border-white/[0.1]
                       rounded-2xl shadow-2xl dark:shadow-none overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0
                            border-b border-slate-100 dark:border-white/[0.07]
                            bg-slate-50/60 dark:bg-white/[0.02]">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-800 dark:text-[#ececec]">
                  {editId ? "Entry Edit" : "নতুন Entry"}
                </h2>
                <p className="text-[10.5px] text-slate-500 dark:text-[#888] mt-0.5">
                  {selLine} · {workDate}
                </p>
              </div>
              <button onClick={closeForm}
                className="w-7 h-7 rounded-lg flex items-center justify-center
                           border border-slate-200 dark:border-white/[0.09]
                           text-slate-400 dark:text-[#888]
                           hover:border-red-300 dark:hover:border-red-700/50
                           hover:text-red-500 dark:hover:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-950/20
                           transition-all">
                <X size={13} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium
                                bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40
                                text-red-600 dark:text-red-400">
                  <AlertCircle size={13} />{error}
                </div>
              )}

              {/* Previous day suggestions inside modal */}
              {!editId && prevLine.length > 0 && (
                <>
                  <div>
                    <p className="text-[9.5px] font-bold tracking-widest uppercase
                                  text-slate-400 dark:text-[#777] mb-2">আগের দিনের styles —</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prevLine.slice(0, 8).map(e => (
                        <button key={e.id} onClick={() => prefillFrom(e)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]
                                     bg-slate-50 dark:bg-white/[0.04]
                                     border border-slate-200 dark:border-white/[0.08]
                                     text-slate-600 dark:text-[#aaa]
                                     hover:border-slate-300 dark:hover:border-white/[0.2]
                                     hover:text-slate-800 dark:hover:text-[#ececec]
                                     transition-all">
                          <Copy size={9} />{e.style} · {e.color}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-white/[0.06]" />
                </>
              )}

              {/* Form fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Style No.", field: "style", placeholder: "HKD-2026-001" },
                  { label: "Color",     field: "color", placeholder: "Navy Blue" },
                  { label: "Model",     field: "model", placeholder: "Polo Shirt" },
                  { label: "Buyer",     field: "buyer", placeholder: "H&M" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest
                                      text-slate-500 dark:text-[#888] mb-1.5">{label}</label>
                    <input className="ct-input w-full" placeholder={placeholder}
                      value={form[field]} onChange={e => setF(field, e.target.value)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest
                                  text-slate-500 dark:text-[#888] mb-1.5">Item</label>
                <input className="ct-input w-full" placeholder="Jacket, T-Shirt…"
                  value={form.item} onChange={e => setF("item", e.target.value)} />
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/[0.06]" />

              {/* Size picker */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest
                                  text-slate-500 dark:text-[#888] mb-2">Sizes Select করুন</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SIZES.map(sz => (
                    <button key={sz} onClick={() => toggleSize(sz)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
                        ${form.selectedSizes.includes(sz)
                          ? "bg-slate-800 dark:bg-[#e0e0e0] text-white dark:text-[#1a1a1a] border border-transparent"
                          : "bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#999] hover:border-slate-300 dark:hover:border-white/[0.2] hover:text-slate-700 dark:hover:text-[#ccc]"
                        }`}>
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty grid */}
              {form.selectedSizes.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest
                                    text-slate-500 dark:text-[#888] mb-2">Size-wise Quantity</label>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                    {form.selectedSizes.map(sz => (
                      <div key={sz}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl
                                   bg-slate-50 dark:bg-white/[0.04]
                                   border border-slate-200 dark:border-white/[0.09]
                                   focus-within:border-slate-400 dark:focus-within:border-white/[0.25]
                                   focus-within:ring-2 focus-within:ring-slate-200 dark:focus-within:ring-white/[0.06]
                                   transition-all">
                        <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-[#999] flex-shrink-0 min-w-[22px]">
                          {sz}
                        </span>
                        <input type="number" min="0"
                          value={form.size_quantities[sz] || ""}
                          onChange={e => setF("size_quantities", { ...form.size_quantities, [sz]: e.target.value })}
                          placeholder="0"
                          className="flex-1 min-w-0 bg-transparent border-none outline-none
                                     font-mono text-[13px] text-slate-800 dark:text-[#ececec]
                                     text-right placeholder:text-slate-300 dark:placeholder:text-[#444]" />
                        <span className="text-[9px] text-slate-400 dark:text-[#666] flex-shrink-0">pcs</span>
                      </div>
                    ))}
                  </div>

                  {totalPcs > 0 && (
                    <div className="flex items-center justify-between mt-3 px-4 py-3 rounded-xl
                                    bg-slate-50 dark:bg-white/[0.04]
                                    border border-slate-200 dark:border-white/[0.09]">
                      <span className="text-[11px] text-slate-500 dark:text-[#999]">Total</span>
                      <span className="font-mono text-[16px] font-medium text-slate-800 dark:text-[#ececec]">
                        {fmt(totalPcs)} pcs
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           text-[13px] font-semibold mt-1
                           bg-slate-800 dark:bg-[#e0e0e0]
                           text-white dark:text-[#1a1a1a]
                           hover:bg-slate-700 dark:hover:bg-white
                           disabled:opacity-40 disabled:cursor-not-allowed
                           border border-transparent
                           transition-all hover:-translate-y-px active:scale-[.98]">
                {saving
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> Saving…</>
                  : <><Save size={13} /> {editId ? "Update করুন" : "Save করুন"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared input styles via global style tag */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: none; }
        }
        .ct-input {
          background: #f9f9f8;
          border: 1px solid rgba(0,0,0,.1);
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13px;
          color: #1c1c1c;
          outline: none;
          appearance: none;
          font-family: inherit;
          transition: border-color .15s, box-shadow .15s;
        }
        .ct-input:focus {
          border-color: rgba(0,0,0,.25);
          box-shadow: 0 0 0 3px rgba(0,0,0,.05);
        }
        .ct-input::placeholder { color: #c0bfbb; }
        .ct-input option { background: #fff; color: #1c1c1c; }

        .dark .ct-input {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          color: #ececec;
        }
        .dark .ct-input:focus {
          border-color: rgba(255,255,255,.2);
          box-shadow: 0 0 0 3px rgba(255,255,255,.05);
        }
        .dark .ct-input::placeholder { color: #555; }
        .dark .ct-input option { background: #252525; color: #ececec; }
      `}</style>
    </div>
  );
}