// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/material-inspection/page.js
//
// Material Warehouse side: incoming batches from Material Receive show up
// here as bell-icon notifications (read/unread), one per Item Code/PDM +
// Color batch (status "pending_inspection"). Expanding a batch shows the
// full Received info (Date, Invoice, Buyer, Season, PO, Style/Model, Item
// Code/PDM, Color, Received Roll/Yds), then lets the user enter a Passed
// Roll / Passed Yds (<= received). Whatever isn't passed is automatically
// recorded as Rejected. Saving moves the batch to "pending" (ready for
// Location Assignment) or "rejected" (if 0/0 passed) -- either way it
// leaves the inspection worklist and shows up in the History tab instead.
//
// "Reject All" is a one-click shortcut that passes 0/0 without having to
// type it in manually.

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell, ChevronDown, ChevronUp, History as HistoryIcon, ClipboardCheck, PackageSearch,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-xs text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7a4a8a]/30 focus:border-[#7a4a8a] dark:focus:border-[#c68fd4] transition-colors";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-xs font-medium px-4 py-2 hover:bg-[#7a4a8a] dark:hover:bg-[#c68fd4] transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-xs font-medium px-3 py-1.5 hover:border-[#7a4a8a] hover:text-[#7a4a8a] dark:hover:border-[#c68fd4] dark:hover:text-[#c68fd4] transition-colors disabled:opacity-40 disabled:pointer-events-none";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#a04a3a]/40 bg-white dark:bg-[#2a241b] text-[#a04a3a] text-xs font-medium px-3 py-1.5 hover:bg-[#a04a3a]/10 transition-colors disabled:opacity-40 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";
const chipPending = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b8933a]/15 text-[#8a6a1a] dark:bg-[#e0c068]/15 dark:text-[#e0c068]";
const chipPartial = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#3d6a8a]/15 text-[#2c4a63] dark:bg-[#6fa8d0]/15 dark:text-[#6fa8d0]";
const chipApproved = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#5ca068]/15 text-[#3d7a4a] dark:bg-[#8fca9c]/15 dark:text-[#8fca9c]";
const chipRejected = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#a04a3a]/15 text-[#7a3325] dark:bg-[#e08a78]/15 dark:text-[#e08a78]";
const chipAwaiting = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7a4a8a]/15 text-[#5c3468] dark:bg-[#c68fd4]/15 dark:text-[#c68fd4]";

const scrollThin =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-[#7a4a8a]/30 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#7a4a8a]/50 " +
  "[scrollbar-width:thin] [scrollbar-color:#7a4a8a4d_transparent]";

function statusChip(status) {
  if (status === "approved") return <span className={chipApproved}>Approved</span>;
  if (status === "partial") return <span className={chipPartial}>Partially Assigned</span>;
  if (status === "rejected") return <span className={chipRejected}>Rejected</span>;
  if (status === "pending_inspection") return <span className={chipAwaiting}>Awaiting Inspection</span>;
  return <span className={chipPending}>Pending (not racked)</span>;
}

function Field({ label, value, valueClassName = "" }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-[#a08060]">{label}</div>
      <div className={`text-sm font-bold text-[#1a1208] dark:text-[#f0e8dc] truncate ${valueClassName}`}>{value ?? "-"}</div>
    </div>
  );
}

/* ============================================================
   Notification bell -- unread count + dropdown list. Clicking an
   item marks it read and jumps to/expands it in the Worklist tab.
   ============================================================ */

function NotificationBell({ notifications, unreadCount, onRefresh, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) onRefresh(); }}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-white dark:bg-[#2a241b] border border-[#2c2417]/15 dark:border-[#e8ddd0]/15 text-[#7a6250] dark:text-[#a8917d] hover:text-[#7a4a8a] dark:hover:text-[#c68fd4] transition-colors"
        title="Material Inspection notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#a04a3a] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 mt-2 w-80 max-h-96 overflow-auto ${scrollThin} ${card} shadow-lg z-20 p-2 space-y-1`}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7a6250] dark:text-[#a8917d] px-1 pb-1">
            Batches Awaiting Inspection
          </div>
          {notifications.length === 0 ? (
            <div className="text-[11px] italic text-[#a08060] px-1 py-2">Nothing new.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => { setOpen(false); onSelect(n.id); }}
                className={`w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-[#7a4a8a]/8 ${!n.isRead ? "bg-[#7a4a8a]/10" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#a04a3a] shrink-0" />}
                  <span className="font-bold text-sm text-[#1a1208] dark:text-[#f0e8dc]">{n.receive?.buyer}</span>
                  <span className="text-[#a08060]">· {n.receive?.invoiceNo}</span>
                </div>
                <div className="text-[11px] font-medium text-[#7a6250] dark:text-[#a8917d] mt-0.5">
                  {n.itemCodePdm} · {n.color} · {n.rollQty} Roll / {n.yds} Yds · {n.receive?.date?.slice(0, 10)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   InspectionForm -- Passed Roll/Yds inputs, auto-computed Rejected,
   optional note, Save + Reject All.
   ============================================================ */

function InspectionForm({ item, onDone }) {
  const [passedRoll, setPassedRoll] = useState(String(item.rollQty));
  const [passedYds, setPassedYds] = useState(String(item.yds));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pr = Number(passedRoll) || 0;
  const py = Number(passedYds) || 0;
  const rejRoll = Math.max(0, Number(item.rollQty) - pr);
  const rejYds = Math.max(0, Number(item.yds) - py);
  const isPartialPass = pr < Number(item.rollQty) || py < Number(item.yds);

  const submit = async (finalRoll, finalYds, confirmMsg) => {
    setErr("");
    if (finalRoll < 0 || finalYds < 0 || finalRoll > Number(item.rollQty) || finalYds > Number(item.yds)) {
      setErr(`Passed quantity must be between 0 and the received amount (${item.rollQty} Roll / ${item.yds} Yds).`);
      return;
    }
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/material-inspection/${item.id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passedRoll: finalRoll, passedYds: finalYds, note }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to save inspection"); }
      onDone?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#2a241b] border border-[#2c2417]/8 dark:border-[#e8ddd0]/8 rounded-md p-3 space-y-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#5c3468] dark:text-[#c68fd4]">
        Record Inspection Result
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="block mb-1 text-[11px] font-medium tracking-wide text-[#7a6250] dark:text-[#a8917d]">Passed Roll</span>
          <input type="number" min="0" max={item.rollQty} value={passedRoll} onChange={(e) => setPassedRoll(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-xs">
          <span className="block mb-1 text-[11px] font-medium tracking-wide text-[#7a6250] dark:text-[#a8917d]">Passed Yds</span>
          <input type="number" min="0" max={item.yds} value={passedYds} onChange={(e) => setPassedYds(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="text-[11px] text-[#a08060]">
        Rejected (auto-calculated): <b className="text-[#a04a3a]">{rejRoll} Roll / {rejYds} Yds</b>
        <span className="block">Received was {item.rollQty} Roll / {item.yds} Yds.</span>
      </div>

      <label className="block text-xs">
        <span className="block mb-1 text-[11px] font-medium tracking-wide text-[#7a6250] dark:text-[#a8917d]">Note (optional)</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Inspection remarks..." className={`${inputCls} resize-none`} />
      </label>

      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          type="button" disabled={busy}
          onClick={() => submit(pr, py, isPartialPass ? `Approve ${pr} Roll / ${py} Yds and reject ${rejRoll} Roll / ${rejYds} Yds?` : null)}
          className={btnPrimary}
        >
          {busy ? "Saving..." : "Save Inspection"}
        </button>
        <button
          type="button" disabled={busy}
          onClick={() => submit(0, 0, `Reject ALL ${item.rollQty} Roll / ${item.yds} Yds for this batch? This cannot be undone.`)}
          className={btnDanger}
        >
          Reject All
        </button>
      </div>
      {err && <div className="text-[11px] text-[#a04a3a]">{err}</div>}
    </div>
  );
}

/* ============================================================
   WorklistItem -- one batch card, expandable
   ============================================================ */

function WorklistItem({ item, forceOpen, onAfterOpen, onDone }) {
  const [open, setOpen] = useState(!!forceOpen);
  useEffect(() => { if (forceOpen) { setOpen(true); onAfterOpen?.(); } }, [forceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = item.receive || {};
  const styleLabel = (r.styles || []).map((s) => (s.model ? `${s.style} | ${s.model}` : s.style)).join(", ");

  return (
    <div className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#7a4a8a]/5">
        {open ? <ChevronUp size={14} className="text-[#a08060]" /> : <ChevronDown size={14} className="text-[#a08060]" />}
        <span className="text-sm font-bold text-[#1a1208] dark:text-[#f0e8dc]">{r.buyer}</span>
        <span className={chip}>{r.invoiceNo}</span>
        <span className="text-xs font-semibold text-[#7a6250] dark:text-[#a8917d]">{item.itemCodePdm} · {item.color}</span>
        <span className="text-[11px] font-medium text-[#a08060] ml-2">{r.date?.slice(0, 10)}</span>
        <span className="ml-auto">{statusChip(item.status)}</span>
      </button>

      {open && (
        <div className="border-t border-[#2c2417]/10 dark:border-[#e8ddd0]/10 p-3 space-y-3">
          <div className="rounded-lg border-2 border-[#7a4a8a]/25 dark:border-[#c68fd4]/25 bg-[#7a4a8a]/6 dark:bg-[#c68fd4]/6 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5c3468] dark:text-[#c68fd4] mb-2">
              <ClipboardCheck size={12} /> Received Info
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              <Field label="Date" value={r.date?.slice(0, 10)} />
              <Field label="Invoice No." value={r.invoiceNo} />
              <Field label="From" value={r.fromType} />
              <Field label="Warehouse" value={r.warehouse} />
              <Field label="Buyer" value={r.buyer} />
              <Field label="Season" value={r.season} />
              <Field label="PO" value={r.po} />
              <Field label="Style / Model" value={styleLabel || "-"} />
              <Field label="Item" value={r.item} />
              <Field label="Buy" value={r.buy} />
              <Field label="Item Code/PDM" value={item.itemCodePdm} valueClassName="text-[#8a4a24] dark:text-[#d4955e]" />
              <Field label="Color" value={item.color} />
              <Field label="Received Roll / Yds" value={`${item.rollQty} Roll / ${item.yds} Yds`} valueClassName="text-base" />
              {r.remark && <Field label="Remark" value={r.remark} />}
            </div>
          </div>

          <InspectionForm item={item} onDone={onDone} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   History tab -- every batch already inspected
   ============================================================ */

function HistoryTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/material-inspection/history`, { credentials: "include" });
        setRows(await res.json());
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2c2417]/10 dark:border-[#e8ddd0]/10">
        <HistoryIcon size={16} className="text-[#7a4a8a] dark:text-[#c68fd4]" />
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Inspection History</h2>
        <span className="text-[11px] text-[#a08060]">({rows.length})</span>
      </div>
      <div className={`max-h-[70vh] overflow-auto ${scrollThin}`}>
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-xs">No inspections yet.</div>
        ) : (
          <table className="min-w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Inspected On</th>
                <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold">Item Code/PDM</th>
                <th className="px-3 py-2 text-left font-semibold">Color</th>
                <th className="px-3 py-2 text-left font-semibold">Received</th>
                <th className="px-3 py-2 text-left font-semibold">Passed</th>
                <th className="px-3 py-2 text-left font-semibold">Rejected</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#7a4a8a]/5">
                  <td className="px-3 py-2 whitespace-nowrap">{r.inspectedAt?.slice(0, 10) || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.receive?.invoiceNo}</td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.receive?.buyer}</td>
                  <td className="px-3 py-2 text-[#8a4a24] dark:text-[#d4955e] font-semibold whitespace-nowrap">{r.itemCodePdm}</td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.color}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.rollQty} Roll / {r.yds} Yds</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#3d7a4a] dark:text-[#8fca9c] font-medium">{r.passedRoll} Roll / {r.passedYds} Yds</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#a04a3a] font-medium">{r.rejectedRoll} Roll / {r.rejectedYds} Yds</td>
                  <td className="px-3 py-2 whitespace-nowrap">{statusChip(r.status)}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate" title={r.inspectionNote || undefined}>{r.inspectionNote || "-"}</td>
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

export default function MaterialInspectionPage() {
  const [tab, setTab] = useState("worklist"); // "worklist" | "history"
  const [worklist, setWorklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState("");

  const fetchWorklist = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/material-inspection`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load worklist");
      setWorklist(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/material-inspection/notifications`, { credentials: "include" });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchWorklist(); fetchNotifications(); }, [fetchWorklist, fetchNotifications]);

  const handleSelectNotification = async (id) => {
    setTab("worklist");
    setOpenId(id);
    try {
      await fetch(`${API_URL}/material-inspection/${id}/read`, { method: "PATCH", credentials: "include" });
      fetchNotifications();
    } catch { /* ignore */ }
  };

  const refreshAll = () => { fetchWorklist(); fetchNotifications(); };

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={22} className="text-[#7a4a8a] dark:text-[#c68fd4]" />
            <div>
              <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
                Material <em className="italic text-[#7a4a8a] dark:text-[#c68fd4]">Inspection</em>
              </h1>
              <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
                Review newly received batches and approve how much actually passed QC. Only the Passed Roll/Yds
                becomes available for rack assignment; the rest is recorded as Rejected.
              </p>
            </div>
          </div>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onRefresh={fetchNotifications} onSelect={handleSelectNotification} />
        </div>

        {error && <div className="rounded-lg bg-[#b87a4a]/10 border border-[#b87a4a]/25 text-[#8a4a24] dark:text-[#e0a878] text-xs px-3 py-2"><b>Error:</b> {error}</div>}

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("worklist")} className={tab === "worklist" ? btnPrimary : btnSecondary}>
            <PackageSearch size={13} /> Worklist
          </button>
          <button type="button" onClick={() => setTab("history")} className={tab === "history" ? btnPrimary : btnSecondary}>
            <HistoryIcon size={13} /> History
          </button>
        </div>

        {tab === "worklist" ? (
          loading ? (
            <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
          ) : worklist.length === 0 ? (
            <div className="text-center py-8 text-[#a08060] text-xs">No batches waiting for inspection.</div>
          ) : (
            <div className="space-y-2">
              {worklist.map((item) => (
                <WorklistItem
                  key={item.id}
                  item={item}
                  forceOpen={openId === item.id}
                  onAfterOpen={() => setOpenId(null)}
                  onDone={refreshAll}
                />
              ))}
            </div>
          )
        ) : (
          <HistoryTab />
        )}
      </div>
    </div>
  );
}