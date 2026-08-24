// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/dashboard/page.js

//
// Pure DUMMY-DATA version of the buyer-overview dashboard. No fetch, no
// backend dependency -- everything on screen is hard-coded so this can be
// dropped in and viewed standalone (e.g. for a walkthrough/demo before the
// real endpoint is ready). Same visual structure as the live dashboard:
//   - 4 KPI cards
//   - Buyer-wise Available Roll bar chart
//   - Item Code-wise Available Roll + Yds bar chart
//   - Batch Status Breakdown pie
//   - Requisition Fulfillment Status pie
//
// The date picker still works here, but purely as a client-side demo: it
// deterministically reshuffles the two pies' counts (seeded off the date
// string, so the same date always gives the same numbers) to illustrate
// what "date-wise" would look like once wired to the real endpoint. The
// KPI cards and both bar charts stay fixed (all-time totals), same as the
// live page.

"use client";

import { Boxes, CalendarDays, ClipboardCheck, Layers, PackageSearch } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

/* ============================================================
   DUMMY DATA
   ============================================================ */

const BUYERS = [
  "Decathlon - Knit",
  "Decathlon - Woven",
  "Walmart",
  "Columbia",
  "ZXY",
  "CTC",
  "DIESEL",
  "Sports Group Denmark",
  "Identity",
  "Fifth Avenur",
];

// Hand-picked descending Roll figures per buyer above, Yds derived at a
// roughly realistic ~185 yds/roll factor.
const BUYER_ROLLS = [3200, 2850, 980, 760, 690, 610, 540, 410, 260, 150];

const buyerStock = BUYERS.map((buyer, i) => {
  const roll = BUYER_ROLLS[i];
  return { buyer, roll, yds: roll * 185 };
});

// Item codes exactly as given.
const ITEM_CODES = [
  "2743740", "4156987", "2851729", "2741751", "2985763",
  "4139064", "2655938", "4890250", "4707927", "5835216",
  "4412530", "4819322", "5431884", "5893053", "5500547",
  "4501848", "5928490", "4526973", "4750526", "5835227",
];

// Descending Roll figures for the 20 item codes above, Yds at the same
// ~185 yds/roll factor.
const ITEM_ROLLS = [
  820, 760, 705, 650, 600, 555, 510, 470, 430, 395,
  360, 330, 300, 270, 245, 220, 195, 175, 155, 135,
];

const itemCodeStock = ITEM_CODES.map((itemCode, i) => {
  const roll = ITEM_ROLLS[i];
  return { itemCode, roll, yds: roll * 185 };
});

const KPIS = {
  totalAvailableRoll: 29540,
  totalAvailableYds: 4358948.55,
  pendingInspectionCount: 14,
  totalReceivingCount: 342,
};

const BASE_STATUS_BREAKDOWN = [
  { status: "approved", count: 300 },
  { status: "partial", count: 25 },
  { status: "pending", count: 10 },
  { status: "pending_inspection", count: 14 },
  { status: "rejected", count: 3 },
];

const BASE_REQUISITION_BREAKDOWN = [
  { status: "fulfilled", count: 40 },
  { status: "partial", count: 12 },
  { status: "pending", count: 8 },
];

/* ============================================================
   White theme tokens (same as live dashboard)
   ============================================================ */
const T = {
  bg: "#f5f4f1",
  panel: "#ffffff",
  border: "#e7e2d8",
  text: "#1a1208",
  muted: "#8a7d6a",
  amber: "#b87a4a",
  amberDark: "#8a4a24",
  teal: "#3d8a7a",
  sage: "#5ca068",
  brick: "#c4544d",
  slate: "#3d6a8a",
  gold: "#c88a12",
};

const displayFont = `'Barlow Condensed', 'Oswald', sans-serif`;
const bodyFont = `'IBM Plex Sans', 'Inter', sans-serif`;
const monoFont = `'IBM Plex Mono', 'JetBrains Mono', monospace`;

const STATUS_COLORS = {
  approved: T.sage,
  partial: T.slate,
  pending: T.gold,
  pending_inspection: "#7a4a8a",
  rejected: T.brick,
};
const STATUS_LABELS = {
  approved: "Approved",
  partial: "Partially Assigned",
  pending: "Pending",
  pending_inspection: "Awaiting Inspection",
  rejected: "Rejected",
};

const REQ_COLORS = { pending: T.gold, partial: T.slate, fulfilled: T.sage };
const REQ_LABELS = { pending: "Pending", partial: "Partially Issued", fulfilled: "Fulfilled" };

const fmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Tiny seeded PRNG (mulberry32) keyed off a string -- gives the SAME
// "random" numbers every time for the same date, so picking a date is
// stable/deterministic rather than reshuffling on every render.
function seededRng(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(h, 31) + seedStr.charCodeAt(i)) >>> 0;
  }
  return function next() {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

// Demo-only: derive a plausible-looking day's breakdown from the base
// totals, seeded by the selected date, so switching dates visibly changes
// the two pies while staying deterministic per date. Purely illustrative
// -- the real page reads this straight from the backend instead.
function deriveForDate(base, dateStr) {
  const rng = seededRng(dateStr);
  return base
    .map((b) => ({ ...b, count: Math.max(0, Math.round(b.count * (0.4 + rng() * 1.3))) }))
    .filter((b) => b.count > 0);
}

/* ============================================================
   Small shared bits (same as live dashboard)
   ============================================================ */

function Panel({ eyebrow, title, right, children }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        height: "100%",
        boxShadow: "0 1px 3px rgba(26,18,8,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: monoFont, fontSize: 11, letterSpacing: "0.12em", color: T.amber, textTransform: "uppercase", marginBottom: 3 }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 600, color: T.text }}>{title}</div>
        </div>
        {right}
      </div>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "22px 26px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        boxShadow: "0 1px 3px rgba(26,18,8,0.04)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%", background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={22} color={accent} strokeWidth={2} />
        <span style={{ fontFamily: monoFont, fontSize: 13, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontFamily: displayFont, fontSize: 48, fontWeight: 700, color: T.text, lineHeight: 1 }}>{fmt(value)}</span>
        {unit && <span style={{ fontFamily: monoFont, fontSize: 16, color: T.muted }}>{unit}</span>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 13px", fontFamily: monoFont, fontSize: 13, color: T.text, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ color: T.muted, marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {unit || ""}
        </div>
      ))}
    </div>
  );
}

function PieLegendList({ data, colorMap, labelMap, total }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center" }}>
      {data.map((d) => (
        <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: bodyFont, fontSize: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: colorMap[d.status] || T.muted, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: T.text, flex: 1 }}>{labelMap[d.status] || d.status}</span>
          <span style={{ fontFamily: monoFont, fontSize: 13, color: T.muted }}>
            {d.count} {total ? `(${Math.round((d.count / total) * 100)}%)` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

const handleWheelScroll = (e) => {
  if (e.deltaY === 0) return;
  const el = e.currentTarget;
  if (el.scrollWidth <= el.clientWidth) return;
  e.preventDefault();
  el.scrollLeft += e.deltaY;
};

/* ============================================================
   Main page
   ============================================================ */

export default function DummyDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const isToday = selectedDate === todayStr();

  const statusBreakdown = useMemo(() => deriveForDate(BASE_STATUS_BREAKDOWN, selectedDate), [selectedDate]);
  const requisitionBreakdown = useMemo(() => deriveForDate(BASE_REQUISITION_BREAKDOWN, selectedDate), [selectedDate]);
  const statusTotal = statusBreakdown.reduce((s, r) => s + r.count, 0);
  const reqTotal = requisitionBreakdown.reduce((s, r) => s + r.count, 0);

  return (
    <div
      style={{
        background: T.bg,
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        color: T.text,
        fontFamily: bodyFont,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        html, body { overflow: hidden; }
        .buyer-scroll { height: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 8px; scrollbar-color: ${T.amber} ${T.border}; scrollbar-width: thin; }
        .buyer-scroll::-webkit-scrollbar { height: 9px; }
        .buyer-scroll::-webkit-scrollbar-track { background: ${T.border}; border-radius: 5px; }
        .buyer-scroll::-webkit-scrollbar-thumb { background: ${T.amber}; border-radius: 5px; }
        .buyer-scroll::-webkit-scrollbar-thumb:hover { background: ${T.amberDark}; }
        .itemcode-scroll { height: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 8px; scrollbar-color: ${T.slate} ${T.border}; scrollbar-width: thin; }
        .itemcode-scroll::-webkit-scrollbar { height: 9px; }
        .itemcode-scroll::-webkit-scrollbar-track { background: ${T.border}; border-radius: 5px; }
        .itemcode-scroll::-webkit-scrollbar-thumb { background: ${T.slate}; border-radius: 5px; }
        .itemcode-scroll::-webkit-scrollbar-thumb:hover { background: #2a4a63; }
        .date-picker { font-family: ${monoFont}; font-size: 12px; color: ${T.text}; background: #fff; border: 1px solid ${T.border}; border-radius: 6px; padding: 5px 9px; outline: none; }
        .date-picker:focus { border-color: ${T.amber}; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: monoFont, fontSize: 10, letterSpacing: "0.14em", color: T.muted, textTransform: "uppercase", marginBottom: 2 }}>
            HKD Outdoor Innovations · Material Warehouse
          </div>
          <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 700, color: T.text }}>
            <em style={{ color: T.amber, fontStyle: "italic" }}>Overview</em>
            <span style={{ fontFamily: monoFont, fontSize: 11, color: T.muted, marginLeft: 10, fontStyle: "normal" }}>(demo data)</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDays size={14} color={T.muted} />
            <input
              type="date"
              className="date-picker"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            />
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr())}
                style={{ fontFamily: monoFont, fontSize: 11, color: T.amber, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                Today
              </button>
            )}
          </div>
          <div style={{ fontFamily: monoFont, fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, display: "inline-block" }} />
            Demo
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flexShrink: 0, height: 150 }}>
        <KpiCard icon={Boxes} label="Available Roll" value={KPIS.totalAvailableRoll} unit="Roll" accent={T.amber} />
        <KpiCard icon={Layers} label="Available Yds" value={KPIS.totalAvailableYds} unit="Yds" accent={T.teal} />
        <KpiCard icon={ClipboardCheck} label="Inspection Pending" value={KPIS.pendingInspectionCount} unit="batches" accent="#7a4a8a" />
        <KpiCard icon={PackageSearch} label="Total Receiving" value={KPIS.totalReceivingCount} unit="invoices" accent={T.slate} />
      </div>

      {/* Charts row -- 4 columns: buyer bar, item-code bar, batch pie, requisition pie */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 0.85fr 0.85fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Buyer-wise Roll */}
        <Panel
          eyebrow="By Buyer · All-time"
          title="Available Roll"
          right={<span style={{ fontFamily: monoFont, fontSize: 11, color: T.muted }}>{buyerStock.length} buyers</span>}
        >
          <div className="buyer-scroll" onWheel={handleWheelScroll}>
            <div style={{ height: "100%", minWidth: Math.max(buyerStock.length * 108, 100) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyerStock} margin={{ left: 4, right: 16, top: 4, bottom: 4 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis
                    dataKey="buyer"
                    tick={{ fill: T.text, fontSize: 11.5, fontFamily: bodyFont }}
                    axisLine={{ stroke: T.border }}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(v) => (typeof v === "string" && v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                  />
                  <YAxis type="number" tick={{ fill: T.muted, fontSize: 11, fontFamily: monoFont }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltip unit=" roll" />} cursor={{ fill: "rgba(184,122,74,0.06)" }} />
                  <Bar dataKey="roll" name="Roll" fill={T.amber} radius={[5, 5, 0, 0]} barSize={54} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        {/* Item Code-wise Roll + Yds */}
        <Panel
          eyebrow="By Item Code · All-time"
          title="Available Roll & Yds"
          right={<span style={{ fontFamily: monoFont, fontSize: 11, color: T.muted }}>{itemCodeStock.length} item codes</span>}
        >
          <div className="itemcode-scroll" onWheel={handleWheelScroll}>
            <div style={{ height: "100%", minWidth: Math.max(itemCodeStock.length * 130, 100) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={itemCodeStock} margin={{ left: 4, right: 8, top: 4, bottom: 4 }} barCategoryGap="20%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis
                    dataKey="itemCode"
                    tick={{ fill: T.text, fontSize: 11.5, fontFamily: bodyFont }}
                    axisLine={{ stroke: T.border }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis yAxisId="roll" type="number" tick={{ fill: T.amber, fontSize: 11, fontFamily: monoFont }} axisLine={false} tickLine={false} width={40} />
                  <YAxis yAxisId="yds" orientation="right" type="number" tick={{ fill: T.slate, fontSize: 11, fontFamily: monoFont }} axisLine={false} tickLine={false} width={54} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(61,106,138,0.06)" }} />
                  <Bar yAxisId="roll" dataKey="roll" name="Roll" fill={T.amber} radius={[5, 5, 0, 0]} barSize={28} />
                  <Bar yAxisId="yds" dataKey="yds" name="Yds" fill={T.slate} radius={[5, 5, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        {/* Batch status pie -- demo-derived per selected date */}
        <Panel eyebrow={`Stock Batches · ${selectedDate}`} title="Status Breakdown">
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 4 }}>
            <div style={{ flex: 1.3, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    innerRadius="55%"
                    outerRadius="88%"
                    paddingAngle={2}
                    strokeWidth={1}
                    stroke={T.panel}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || T.muted} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 11px", fontFamily: bodyFont, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                          {STATUS_LABELS[d.status] || d.status}: <b>{d.count}</b>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <PieLegendList data={statusBreakdown} colorMap={STATUS_COLORS} labelMap={STATUS_LABELS} total={statusTotal} />
            </div>
          </div>
        </Panel>

        {/* Requisition status pie -- demo-derived per selected date */}
        <Panel eyebrow={`Cutting Requisitions · ${selectedDate}`} title="Fulfillment Status">
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 4 }}>
            <div style={{ flex: 1.3, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requisitionBreakdown}
                    dataKey="count"
                    nameKey="status"
                    innerRadius="55%"
                    outerRadius="88%"
                    paddingAngle={2}
                    strokeWidth={1}
                    stroke={T.panel}
                  >
                    {requisitionBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={REQ_COLORS[entry.status] || T.muted} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 11px", fontFamily: bodyFont, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                          {REQ_LABELS[d.status] || d.status}: <b>{d.count}</b>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <PieLegendList data={requisitionBreakdown} colorMap={REQ_COLORS} labelMap={REQ_LABELS} total={reqTotal} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}