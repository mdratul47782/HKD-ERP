// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/cutting-issue/page.js

//
// Material Warehouse side: incoming Requisitions from Cutting show up
// here as bell-icon notifications (read/unread). Expanding a requisition
// shows its requested Item Code/PDM + Color rows (Requested Yds only --
// Cutting never sends a Roll, that's decided here); "Check stock" pulls
// the same rack-wise/date-wise breakdown used elsewhere (GET
// /material-stock) so the user can see exactly which rack + date to pull
// from, then enters how much Roll/Yds to issue from a chosen rack.
// Issuing decrements that rack's available stock immediately. A History
// tab lists every issue action ever made.
//
// There is no PO on a Cutting Requisition -- everything is tracked by
// Buyer/Floor/Season/Style/Model instead. There is also no hard cap
// stopping the warehouse from issuing MORE than the requested Yds (Roll
// was never requested by Cutting to begin with, and Consumption-based Yds
// estimates can be off) -- the frontend just confirms with the user
// before an over-issue goes through.
//
// UPDATE 2: "What Cutting requested" and "What's available in stock" are
// now two clearly separated, distinctly labeled blocks instead of being
// visually blended together in small print.
//
// UPDATE 3: Issuing no longer requires BOTH Roll and Yds to be filled in
// on a picked rack row, and a picked rack row is visually colorized
// (green) in the stock table.
//
// UPDATE 4:
//   - The "Cutting Requested" card now shows Requested Yds, Issued So Far,
//     AND Remaining Yds as three clearly labeled figures side by side --
//     previously "how much is still needed" had to be worked out by hand
//     from Requested minus Issued. Remaining is highlighted (amber if
//     something's still needed, green once nothing is).
//   - Every picked-rack row in the issue cart now shows a "Need: X Yds"
//     badge right next to it (not just once, buried in the footer note),
//     so the exact remaining requirement is visible right where the user
//     is typing the amount to issue.
//   - Any error message (issue failed, validation failed, etc.) is now
//     shown as a large, bold, red, boxed banner instead of small grey
//     text, so it can't be missed.

"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { Bell, PackageSearch, ChevronDown, ChevronUp, MapPin, Search, History as HistoryIcon, ClipboardList, ClipboardCheck, Boxes, Check, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const card = "bg-[#f7f5f0] dark:bg-[#221d16] border border-[#2c2417]/10 dark:border-[#e8ddd0]/10 rounded-xl shadow-sm";
const inputCls =
  "w-full rounded-md border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] px-2.5 py-1.5 text-xs text-[#2c2417] dark:text-[#e8ddd0] placeholder:text-[#a08060] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b87a4a]/30 focus:border-[#b87a4a] dark:focus:border-[#d4955e] transition-colors";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#2c2417] dark:bg-[#e8ddd0] text-[#f0ede6] dark:text-[#1b1712] text-xs font-medium px-4 py-2 hover:bg-[#b87a4a] dark:hover:bg-[#d4955e] transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2c2417]/25 dark:border-[#e8ddd0]/25 bg-white dark:bg-[#2a241b] text-[#7a6250] dark:text-[#a8917d] text-xs font-medium px-3 py-1.5 hover:border-[#b87a4a] hover:text-[#b87a4a] dark:hover:border-[#d4955e] dark:hover:text-[#d4955e] transition-colors disabled:opacity-40 disabled:pointer-events-none";
const chip = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b87a4a]/12 text-[#8a4a24] dark:bg-[#d4955e]/15 dark:text-[#d4955e]";
const chipPending = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#b8933a]/15 text-[#8a6a1a] dark:bg-[#e0c068]/15 dark:text-[#e0c068]";
const chipPartial = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#3d6a8a]/15 text-[#2c4a63] dark:bg-[#6fa8d0]/15 dark:text-[#6fa8d0]";
const chipFulfilled = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#5ca068]/15 text-[#3d7a4a] dark:bg-[#8fca9c]/15 dark:text-[#8fca9c]";
// Small badge used to show "how much Yds is still needed" right next to a
// picked rack row -- amber while something's still outstanding, green
// once the remaining amount is 0.
const chipNeedAmber = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#b8933a]/15 text-[#8a6a1a] dark:bg-[#e0c068]/15 dark:text-[#e0c068] whitespace-nowrap";
const chipNeedDone = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5ca068]/15 text-[#3d7a4a] dark:bg-[#8fca9c]/15 dark:text-[#8fca9c] whitespace-nowrap";

const scrollThin =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-[#b87a4a]/30 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#b87a4a]/50 " +
  "[scrollbar-width:thin] [scrollbar-color:#b87a4a4d_transparent]";

function statusChip(status) {
  if (status === "fulfilled") return <span className={chipFulfilled}>Fulfilled</span>;
  if (status === "partial") return <span className={chipPartial}>Partially Issued</span>;
  return <span className={chipPending}>Pending</span>;
}

// Large, impossible-to-miss error banner -- bold red text in a bordered
// box, used everywhere an issue/validation error needs to be shown
// (previously this was tiny grey text that was easy to miss).
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-2.5">
      <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <span className="text-base md:text-lg font-extrabold text-red-600 dark:text-red-400 leading-snug">
        {message}
      </span>
    </div>
  );
}

// Small labeled value used inside the "Cutting Requested" / "Available
// Stock" blocks -- a tiny uppercase label above a larger value, so the
// meaning of every number is unambiguous instead of relying on font color
// alone to tell numbers apart.
function Field({ label, value, valueClassName = "" }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-[#a08060]">{label}</div>
      <div className={`text-sm font-bold text-[#1a1208] dark:text-[#f0e8dc] truncate ${valueClassName}`}>{value}</div>
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
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-white dark:bg-[#2a241b] border border-[#2c2417]/15 dark:border-[#e8ddd0]/15 text-[#7a6250] dark:text-[#a8917d] hover:text-[#b87a4a] dark:hover:text-[#d4955e] transition-colors"
        title="Requisition notifications"
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
            Cutting Requisitions
          </div>
          {notifications.length === 0 ? (
            <div className="text-[11px] italic text-[#a08060] px-1 py-2">No requisitions yet.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => { setOpen(false); onSelect(n.id); }}
                className={`w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-[#b87a4a]/8 ${!n.isRead ? "bg-[#b87a4a]/10" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#a04a3a] shrink-0" />}
                  <span className="font-bold text-sm text-[#1a1208] dark:text-[#f0e8dc]">{n.buyer}</span>
                  <span className="text-[#a08060]">· {n.floor}</span>
                  <span className="ml-auto">{statusChip(n.status)}</span>
                </div>
                <div className="text-[11px] font-medium text-[#7a6250] dark:text-[#a8917d] mt-0.5">
                  Style {n.style}{n.model ? ` · ${n.model}` : ""} · {n.season} · {n.date?.slice(0, 10)}
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
   IssueForm -- for one requisition item: "Check stock" shows a
   FULL-CONTEXT breakdown of every rack allocation that matches this
   Item Code/PDM + Color -- Date, Buyer, Season, Item, Item Code/PDM,
   Color, Style/Model, Rack, Available -- so the warehouse user can
   visually confirm they're pulling the right batch (right Season /
   right Buyer / right Style) before picking a rack, not just the
   right Item Code/PDM + Color.

   Clicking "Pick" on a rack row ADDS it to a picked-racks list below
   (instead of immediately issuing) -- so the user can pick several
   racks (e.g. Rack-1 + Rack-3), type a Roll/Yds amount for EACH one,
   and hit "Issue All" once to apply every row together in a single
   request/transaction. Each picked row now shows a "Need: X Yds" badge
   (remaining requested Yds MINUS whatever's already typed into the other
   picked rows) right next to its inputs, so the user always knows how
   much is still outstanding without having to scroll up to the request
   card. The badge turns green once nothing more is needed.
   ============================================================ */

function IssueForm({ item, requisition, onIssued }) {
  const [stockOpen, setStockOpen] = useState(false);
  const [stockRows, setStockRows] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  // Cart of racks picked for this issue action:
  // [{ allocationId, location, availableRoll, availableYds, roll, yds }]
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const remainingYds = Math.max(0, Number(item.requestedYds) - Number(item.issuedYds));
  const isDone = item.status === "fulfilled";

  const pickedTotalRoll = picked.reduce((s, p) => s + (Number(p.roll) || 0), 0);
  const pickedTotalYds = picked.reduce((s, p) => s + (Number(p.yds) || 0), 0);
  const pickedIds = new Set(picked.map((p) => p.allocationId));

  // Still-needed amount AFTER accounting for everything currently typed
  // into the picked-rack cart -- this is what's shown per-row so the
  // number always reflects "what's left once these amounts go through",
  // not just the static Requisition-level remaining figure.
  const stillNeededAfterCart = Math.max(0, remainingYds - pickedTotalYds);

  const checkStock = async () => {
    if (stockOpen) { setStockOpen(false); return; }
    setStockOpen(true);
    setLoadingStock(true);
    try {
      const params = new URLSearchParams({ itemCodePdm: item.itemCodePdm, color: item.color });
      const res = await fetch(`${API_URL}/material-stock?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      setStockRows(data.rows || []);
    } catch {
      setStockRows([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const pickRack = (row) => {
    setErr("");
    setPicked((p) => {
      if (p.some((x) => x.allocationId === row.itemId)) return p; // already picked, don't duplicate
      return [...p, { allocationId: row.itemId, location: row.location, availableRoll: row.availableRoll, availableYds: row.availableYds, roll: "", yds: "" }];
    });
  };

  const removePicked = (allocationId) => setPicked((p) => p.filter((x) => x.allocationId !== allocationId));

  const updatePicked = (allocationId, field, v) =>
    setPicked((p) => p.map((x) => (x.allocationId === allocationId ? { ...x, [field]: v } : x)));

  const handleIssueAll = async () => {
    setErr("");
    if (picked.length === 0) { setErr("Pick at least one rack first."); return; }
    // Roll and Yds do NOT both have to be filled in -- only reject a row
    // where BOTH are 0/blank, since that wouldn't issue anything at all.
    for (const p of picked) {
      const r = Number(p.roll) || 0;
      const y = Number(p.yds) || 0;
      if (r <= 0 && y <= 0) {
        setErr(`Enter a Roll or Yds amount for ${p.location}.`);
        return;
      }
    }

    // No hard cap on issuing more than requested -- just confirm with the
    // user first, since Cutting's Consumption-based Yds is an estimate and
    // the warehouse is trusted to judge the real need on the floor.
    if (pickedTotalYds > remainingYds) {
      const over = Math.round((pickedTotalYds - remainingYds) * 100) / 100;
      const proceed = window.confirm(
        `This issues ${pickedTotalYds} Yds, which is ${over} Yds more than the ${remainingYds} Yds still remaining on the Requisition (Requested ${item.requestedYds} Yds total). Continue anyway?`
      );
      if (!proceed) return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/cutting-issue/${item.id}/batch`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocations: picked.map((p) => ({ allocationId: p.allocationId, rollQty: p.roll || 0, yds: p.yds || 0 })),
        }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || "Failed to issue"); }
      setPicked([]); setStockOpen(false);
      onIssued?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={checkStock} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4a6578] dark:text-[#8fb0c4] hover:underline">
        <Search size={13} /> {stockOpen ? "Hide" : "Check"} stock (rack + date wise)
      </button>

      {stockOpen && (
        loadingStock ? (
          <div className="text-xs text-[#a08060] italic">Checking...</div>
        ) : stockRows.length === 0 ? (
          <div className="text-xs italic text-[#a08060]">No available stock found for this Item Code/PDM + Color.</div>
        ) : (
          <div className="space-y-2">
            {/* Everything about what Cutting requested (Buyer/Season/Style/
               Model/Item Code/Color) already lives in the "Cutting
               Requested" card above -- no need to restate it here. This
               panel is purely "what's on the shelf". Blue theme, matches
               the rest of the app's "stock" styling elsewhere. */}
            <div className="rounded-lg border-2 border-[#3d6a8a]/25 dark:border-[#6fa8d0]/25 overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 bg-[#2c4a63]/10 dark:bg-[#6fa8d0]/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#2c4a63] dark:text-[#6fa8d0]">
                  <Boxes size={12} /> Available Stock ({stockRows.length} rack{stockRows.length > 1 ? "s" : ""})
                </div>
                <div className="text-[10px] text-[#a04a3a]">Rows with a different Season than requested are highlighted in red. Picked racks are highlighted in green.</div>
              </div>
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#dde8ef]/60 dark:bg-white/[0.03] text-[#4a6578] dark:text-[#8fb0c4]">
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                    <th className="px-3 py-2 text-left font-semibold">Season</th>
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-left font-semibold">Item Code/PDM</th>
                    <th className="px-3 py-2 text-left font-semibold">Color</th>
                    <th className="px-3 py-2 text-left font-semibold">Style | Model</th>
                    <th className="px-3 py-2 text-left font-semibold">Rack</th>
                    <th className="px-3 py-2 text-right font-semibold">Available</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((r) => {
                    const alreadyPicked = pickedIds.has(r.itemId);
                    const seasonMismatch = requisition?.season && r.season && r.season !== requisition.season;
                    const styleLabel = (r.styles || [])
                      .map((s) => (s.model ? `${s.style} | ${s.model}` : s.style))
                      .join(", ");
                    // Picked takes visual priority over the season-mismatch
                    // highlight -- "this row is already queued up" is the
                    // more important thing to notice at a glance.
                    const rowClass = alreadyPicked
                      ? "bg-[#5ca068]/12 dark:bg-[#5ca068]/15"
                      : seasonMismatch
                      ? "bg-[#a04a3a]/8 dark:bg-[#a04a3a]/10"
                      : "";
                    return (
                      <tr
                        key={r.itemId}
                        className={`border-t border-[#3d6a8a]/10 dark:border-[#6fa8d0]/10 align-top transition-colors ${rowClass}`}
                      >
                        <td className="px-3 py-2 break-words">{r.date?.slice(0, 10)}</td>
                        <td className="px-3 py-2 break-words">{r.buyer}</td>
                        <td className={`px-3 py-2 break-words font-semibold ${seasonMismatch && !alreadyPicked ? "text-[#a04a3a]" : ""}`}>
                          {r.season}
                        </td>
                        <td className="px-3 py-2 break-words">{r.item}</td>
                        <td className="px-3 py-2 break-words font-semibold text-[#8a4a24] dark:text-[#d4955e]">{r.itemCodePdm}</td>
                        <td className="px-3 py-2 break-words">{r.color}</td>
                        <td className="px-3 py-2 break-words">{styleLabel || "-"}</td>
                        <td className="px-3 py-2 break-words"><MapPin size={11} className="inline mr-0.5 text-[#3d6a8a] dark:text-[#6fa8d0]" />{r.location}</td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{r.availableRoll} Roll / {r.availableYds} Yds</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => pickRack(r)}
                            disabled={alreadyPicked}
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold hover:underline disabled:pointer-events-none ${
                              alreadyPicked
                                ? "text-[#3d7a4a] dark:text-[#8fca9c] opacity-100"
                                : "text-[#b87a4a] disabled:opacity-40"
                            }`}
                          >
                            {alreadyPicked ? (<><Check size={11} /> Picked</>) : "Pick"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <div className="bg-white dark:bg-[#2a241b] border border-[#2c2417]/8 dark:border-[#e8ddd0]/8 rounded-md p-2 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#4a6578] dark:text-[#8fb0c4]">
            {picked.length === 0 ? "Pick one or more racks above to issue from" : `${picked.length} rack${picked.length > 1 ? "s" : ""} picked`}
          </div>
          {/* Live "still need X Yds" summary, updates as amounts are typed
              into the picked rows below. */}
          {picked.length > 0 && (
            <span className={stillNeededAfterCart > 0 ? chipNeedAmber : chipNeedDone}>
              {stillNeededAfterCart > 0 ? `Still need: ${stillNeededAfterCart} Yds` : "Fully covered"}
            </span>
          )}
        </div>

        {picked.length > 0 && (
          <div className="space-y-1">
            {picked.map((p) => (
              <div key={p.allocationId} className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3d7a4a] dark:text-[#8fca9c] w-16 shrink-0">
                  <MapPin size={10} />{p.location}
                </span>
                <input
                  type="number" placeholder="Roll" value={p.roll}
                  onChange={(e) => updatePicked(p.allocationId, "roll", e.target.value)}
                  className={`${inputCls} flex-1 min-w-[70px]`}
                />
                <input
                  type="number" placeholder="Yds" value={p.yds}
                  onChange={(e) => updatePicked(p.allocationId, "yds", e.target.value)}
                  className={`${inputCls} flex-1 min-w-[70px]`}
                />
                <span className="text-[10px] text-[#a08060] shrink-0 whitespace-nowrap">
                  max {p.availableRoll}/{p.availableYds}
                </span>
                {/* Per-row "Need: X Yds" badge -- sits right next to this
                    picked rack so the outstanding requirement is visible
                    exactly where the user is typing the amount, without
                    needing to scroll up to the request card. */}
                <span className={stillNeededAfterCart > 0 ? chipNeedAmber : chipNeedDone}>
                  {stillNeededAfterCart > 0 ? `Need: ${stillNeededAfterCart} Yds` : "Covered"}
                </span>
                <button type="button" onClick={() => removePicked(p.allocationId)} className="text-[11px] font-medium text-[#a04a3a] hover:underline shrink-0">
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="text-[11px] text-[#7a6250] dark:text-[#a8917d]">
                Total: <b>{pickedTotalRoll} Roll / {pickedTotalYds} Yds</b>
              </span>
              <button
                type="button" onClick={handleIssueAll} disabled={busy}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#2c4a63] dark:bg-[#3d6a8a] text-white text-[11px] font-medium px-3 py-1.5 hover:bg-[#3d6a8a] dark:hover:bg-[#4a7a9a] transition-colors disabled:opacity-50 shrink-0"
              >
                {busy ? "Issuing..." : `Issue All (${picked.length})`}
              </button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-[#a08060]">
          Up to {remainingYds} Yds remaining against the {item.requestedYds} Yds requested. Roll is entirely your
          call -- Cutting didn't request a Roll count. Either Roll or Yds can be left at 0 on a picked rack (e.g.
          Yds-only or Roll-only issues are fine). You can also issue more than requested if needed (you'll be
          asked to confirm).
          {isDone && <span className="text-[#3d7a4a] dark:text-[#8fca9c] font-medium"> This item is already marked Fulfilled.</span>}
        </div>
        <ErrorBanner message={err} />
      </div>
    </div>
  );
}

/* ============================================================
   Worklist -- requisitions not yet fully fulfilled
   ============================================================ */

function WorklistItem({ req, forceOpen, onAfterOpen, onIssued }) {
  const [open, setOpen] = useState(!!forceOpen);

  useEffect(() => { if (forceOpen) { setOpen(true); onAfterOpen?.(); } }, [forceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#b87a4a]/5">
        {open ? <ChevronUp size={14} className="text-[#a08060]" /> : <ChevronDown size={14} className="text-[#a08060]" />}
        <span className="text-sm font-bold text-[#1a1208] dark:text-[#f0e8dc]">{req.buyer}</span>
        <span className={chip}><MapPin size={10} className="mr-0.5" />{req.floor}</span>
        <span className="text-xs font-semibold text-[#7a6250] dark:text-[#a8917d]">
          Style {req.style}{req.model ? ` · ${req.model}` : ""} · {req.season}
        </span>
        <span className="text-[11px] font-medium text-[#a08060] ml-2">{req.date?.slice(0, 10)}</span>
        <span className="ml-auto">{statusChip(req.status)}</span>
      </button>

      {open && (
        <div className="border-t border-[#2c2417]/10 dark:border-[#e8ddd0]/10 divide-y divide-[#2c2417]/8 dark:divide-[#e8ddd0]/8">
          {req.items.map((item) => {
            // Remaining = Requested minus Issued, floored at 0 -- shown as
            // its own labeled figure so it never has to be worked out by
            // hand from the other two numbers.
            const remaining = Math.max(0, Number(item.requestedYds) - Number(item.issuedYds));
            const remainingClass = remaining > 0
              ? "text-[#8a6a1a] dark:text-[#e0c068]"
              : "text-[#3d7a4a] dark:text-[#8fca9c]";
            return (
              <div key={item.id} className="p-3 space-y-2.5">
                {/* "Cutting Requested" card -- everything Cutting actually
                   typed in (Pcs / Wastage % / Consumption) plus the
                   Requested Yds calculated from them, what's been Issued
                   so far, and how much is still Remaining -- all as their
                   own clearly labeled figures. */}
                <div className="rounded-lg border-2 border-[#b87a4a]/25 dark:border-[#d4955e]/25 bg-[#b87a4a]/6 dark:bg-[#d4955e]/6 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8a4a24] dark:text-[#d4955e]">
                      <ClipboardList size={12} /> Cutting Requested
                    </div>
                    {statusChip(item.status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    <Field label="Buyer" value={req.buyer} />
                    <Field label="Floor" value={req.floor} />
                    <Field label="Season" value={req.season} />
                    <Field label="Style | Model" value={req.model ? `${req.style} | ${req.model}` : req.style} />
                    <Field label="Item Code/PDM" value={item.itemCodePdm} valueClassName="text-[#8a4a24] dark:text-[#d4955e]" />
                    <Field label="Color" value={item.color} />
                    <Field label="Pcs" value={item.pcs} />
                    <Field label="Wastage %" value={`${item.percentage}%`} />
                    <Field label="Consumption" value={`${item.consumption} yds/pc`} />
                    <Field label="Requested Yds" value={`${item.requestedYds} Yds`} valueClassName="text-base" />
                    <Field
                      label="Issued So Far"
                      value={`${item.issuedRoll} Roll / ${item.issuedYds} Yds`}
                      valueClassName="text-[#3d7a4a] dark:text-[#8fca9c]"
                    />
                    <Field
                      label="Remaining Yds"
                      value={`${remaining} Yds`}
                      valueClassName={`text-base ${remainingClass}`}
                    />
                  </div>
                </div>

                <IssueForm item={item} requisition={req} onIssued={onIssued} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   History tab
   ============================================================ */

function HistoryTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/cutting-issue/history`, { credentials: "include" });
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
        <HistoryIcon size={16} className="text-[#b87a4a]" />
        <h2 className="font-serif text-base text-[#1a1208] dark:text-[#f0e8dc]">Issue History</h2>
        <span className="text-[11px] text-[#a08060]">({rows.length})</span>
      </div>
      <div className={`max-h-[70vh] overflow-auto ${scrollThin}`}>
        {loading ? (
          <div className="text-center py-8 text-[#a08060] text-xs">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-[#a08060] text-xs">No issues yet.</div>
        ) : (
          <table className="min-w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#e6e0d4]/70 dark:bg-[#221d16] text-[#7a6250] dark:text-[#a8917d] backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Issued On</th>
                <th className="px-3 py-2 text-left font-semibold">Req. Date</th>
                <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                <th className="px-3 py-2 text-left font-semibold">Floor</th>
                <th className="px-3 py-2 text-left font-semibold">Season</th>
                <th className="px-3 py-2 text-left font-semibold">Style | Model</th>
                <th className="px-3 py-2 text-left font-semibold">Item Code/PDM</th>
                <th className="px-3 py-2 text-left font-semibold">Color</th>
                <th className="px-3 py-2 text-left font-semibold">Requested Yds</th>
                <th className="px-3 py-2 text-left font-semibold">Rack</th>
                <th className="px-3 py-2 text-left font-semibold">Issued Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#2c2417]/8 dark:border-[#e8ddd0]/8 hover:bg-[#b87a4a]/5">
                  <td className="px-3 py-2 whitespace-nowrap">{r.createdAt?.slice(0, 10)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.buyer}</td>
                  <td className="px-3 py-2"><span className={chip}>{r.floor}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.season}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.style}{r.model ? ` / ${r.model}` : ""}</td>
                  <td className="px-3 py-2 text-[#8a4a24] dark:text-[#d4955e] font-semibold whitespace-nowrap">{r.itemCodePdm}</td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.color}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.requestedYds} Yds</td>
                  <td className="px-3 py-2 whitespace-nowrap"><span className={chip}><MapPin size={10} className="mr-0.5" />{r.location}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-[#3d7a4a] dark:text-[#8fca9c]">{r.rollQty} Roll / {r.yds} Yds</td>
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

export default function CuttingIssuePage() {
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
      const res = await fetch(`${API_URL}/cutting-issue`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load worklist");
      setWorklist(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cutting-issue/notifications`, { credentials: "include" });
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
      await fetch(`${API_URL}/cutting-issue/${id}/read`, { method: "PATCH", credentials: "include" });
      fetchNotifications();
    } catch { /* ignore */ }
  };

  const refreshAll = () => { fetchWorklist(); fetchNotifications(); };

  return (
    <div className="min-h-screen bg-[#f0ede6] dark:bg-[#1b1712]">
      <div className="max-w-[1700px] mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={22} className="text-[#b87a4a]" />
            <div>
              <h1 className="font-serif text-2xl text-[#1a1208] dark:text-[#f0e8dc]">
                Cutting <em className="italic text-[#b87a4a] dark:text-[#d4955e]">Issue</em>
              </h1>
              <p className="text-xs text-[#7a6250] dark:text-[#a8917d]">
                Fulfill Requisitions sent by Cutting: check available rack stock and issue the requested Yds (Roll
                is entirely your call).
              </p>
            </div>
          </div>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onRefresh={fetchNotifications} onSelect={handleSelectNotification} />
        </div>

        <ErrorBanner message={error} />

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
            <div className="text-center py-8 text-[#a08060] text-xs">No pending cutting requisitions.</div>
          ) : (
            <div className="space-y-2">
              {worklist.map((req) => (
                <WorklistItem
                  key={req.id}
                  req={req}
                  forceOpen={openId === req.id}
                  onAfterOpen={() => setOpenId(null)}
                  onIssued={refreshAll}
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