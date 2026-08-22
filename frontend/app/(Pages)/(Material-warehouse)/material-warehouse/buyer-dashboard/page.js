// frontend/app/(Pages)/(Material-warehouse)/material-warehouse/buyer-dashboard/page.js
//
// BRAND NEW page -- "Buyer Overview" dashboard. White theme, single
// viewport (h-screen + overflow-hidden, no page scroll at all), reading
// from a brand new endpoint (GET /dashboard/buyer-overview, served by
// buyerDashboard.controllers.js / buyerDashboard.routes.js). Does not
// modify material-dashboard/page.js (the existing dark rack-view
// dashboard) or any other existing page/controller/route.
//
// What's on screen, all at once, no scrolling:
//   - 4 KPI cards: Total Available Roll, Total Available Yds,
//     Pending Inspection, Total Receiving
//   - Buyer-wise Available Roll -- bar chart (the main chart)
//   - Batch Status breakdown -- pie chart
//   - Requisition Status breakdown -- pie chart
//
// NOTE: this intentionally does NOT show rack/location-wise data (the
// existing material-dashboard page already covers that) -- just
// buyer-wise stock + the two pending counts, exactly as requested.

"use client";

import { useEffect, useState } from "react";
import { Boxes, ClipboardCheck, PackageSearch, Layers, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ============================================================
// TEMP: frontend-only DUMMY DATA switch.
// Set this to false once the backend endpoint (GET /dashboard/buyer-
// overview, from buyerDashboard.controllers.js) is ready -- the real
// fetch() call further down is already written and untouched, it's just
// skipped while this is true. Nothing else in this file needs to change.
// ============================================================
const USE_DUMMY_DATA = true;

// Dummy buyer-wise stock -- Decathlon - Knit + Decathlon - Woven
// deliberately make up ~81% of total Roll/Yds (matches the real data
// mix, where Decathlon - Woven dominates), the remaining buyers from the
// BUYERS list split the rest. Shaped exactly like the real API response
// so swapping USE_DUMMY_DATA to false needs no other code changes.
const DUMMY_DATA = {
  kpis: {
    totalAvailableYds: 963950,
    totalAvailableRoll: 5000,
    pendingInspectionCount: 14,
    totalReceivingCount: 342,
  },
  buyerStock: [
    { buyer: "Decathlon - Woven", roll: 3200, yds: 624000 },
    { buyer: "Decathlon - Knit", roll: 850, yds: 161500 },
    { buyer: "Walmart", roll: 220, yds: 46200 },
    { buyer: "Columbia", roll: 180, yds: 36900 },
    { buyer: "ZXY", roll: 140, yds: 26600 },
    { buyer: "CTC", roll: 130, yds: 23400 },
    { buyer: "DIESEL", roll: 110, yds: 19250 },
    { buyer: "Sports Group Denmark", roll: 90, yds: 14400 },
    { buyer: "Identity", roll: 50, yds: 7500 },
    { buyer: "Fifth Avenur", roll: 30, yds: 4200 },
  ],
  statusBreakdown: [
    { status: "approved", count: 300 },
    { status: "partial", count: 25 },
    { status: "pending", count: 10 },
    { status: "pending_inspection", count: 14 },
    { status: "rejected", count: 3 },
  ],
  requisitionBreakdown: [
    { status: "fulfilled", count: 40 },
    { status: "partial", count: 12 },
    { status: "pending", count: 8 },
  ],
};

/* ============================================================
   White theme tokens
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

/* ============================================================
   Small shared bits
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
          <div style={{ fontFamily: monoFont, fontSize: 9, letterSpacing: "0.12em", color: T.amber, textTransform: "uppercase", marginBottom: 2 }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: displayFont, fontSize: 15, fontWeight: 600, color: T.text }}>{title}</div>
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
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        boxShadow: "0 1px 3px rgba(26,18,8,0.04)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon size={13} color={accent} strokeWidth={2} />
        <span style={{ fontFamily: monoFont, fontSize: 9, letterSpacing: "0.08em", color: T.muted, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: displayFont, fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 }}>{fmt(value)}</span>
        {unit && <span style={{ fontFamily: monoFont, fontSize: 10, color: T.muted }}>{unit}</span>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 11px", fontFamily: monoFont, fontSize: 11, color: T.text, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ color: T.muted, marginBottom: 2 }}>{label}</div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
      {data.map((d) => (
        <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: bodyFont, fontSize: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorMap[d.status] || T.muted, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: T.text, flex: 1 }}>{labelMap[d.status] || d.status}</span>
          <span style={{ fontFamily: monoFont, color: T.muted }}>
            {d.count} {total ? `(${Math.round((d.count / total) * 100)}%)` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Main page
   ============================================================ */

export default function BuyerDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // TEMP: serve dummy data until the real backend endpoint is wired up.
    // Flip USE_DUMMY_DATA to false above to switch back to the live fetch
    // below -- everything else on this page already expects this exact
    // shape, so no other change is needed.
    if (USE_DUMMY_DATA) {
      setData(DUMMY_DATA);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/dashboard/buyer-overview`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load buyer dashboard data");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{ height: "100vh", background: T.bg, color: T.brick, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: bodyFont }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ height: "100vh", background: T.bg, color: T.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: bodyFont, gap: 10 }}>
        <Loader2 size={18} className="animate-spin" /> Loading dashboard...
      </div>
    );
  }

  const { kpis, buyerStock = [], statusBreakdown = [], requisitionBreakdown = [] } = data;
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
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: monoFont, fontSize: 10, letterSpacing: "0.14em", color: T.muted, textTransform: "uppercase", marginBottom: 2 }}>
            HKD Outdoor Innovations · Material Warehouse
          </div>
          <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 700, color: T.text }}>
            Buyer <em style={{ color: T.amber, fontStyle: "italic" }}>Overview</em>
          </div>
        </div>
        <div style={{ fontFamily: monoFont, fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.sage, display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0, height: 78 }}>
        <KpiCard icon={Boxes} label="Available Roll" value={kpis.totalAvailableRoll} unit="Roll" accent={T.amber} />
        <KpiCard icon={Layers} label="Available Yds" value={kpis.totalAvailableYds} unit="Yds" accent={T.teal} />
        <KpiCard icon={ClipboardCheck} label="Inspection Pending" value={kpis.pendingInspectionCount} unit="batches" accent="#7a4a8a" />
        <KpiCard icon={PackageSearch} label="Total Receiving" value={kpis.totalReceivingCount} unit="invoices" accent={T.slate} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Buyer-wise Roll -- main bar chart */}
        <Panel
          eyebrow="By Buyer"
          title="Available Roll"
          right={<span style={{ fontFamily: monoFont, fontSize: 9, color: T.muted }}>{buyerStock.length} buyers</span>}
        >
          {buyerStock.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              No stock data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyerStock} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                <XAxis type="number" tick={{ fill: T.muted, fontSize: 10, fontFamily: monoFont }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="buyer"
                  tick={{ fill: T.text, fontSize: 10.5, fontFamily: bodyFont }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  interval={0}
                />
                <Tooltip content={<CustomTooltip unit=" roll" />} cursor={{ fill: "rgba(184,122,74,0.06)" }} />
                <Bar dataKey="roll" name="Roll" fill={T.amber} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Batch status pie */}
        <Panel eyebrow="Stock Batches" title="Status Breakdown">
          {statusBreakdown.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              No batches yet.
            </div>
          ) : (
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
                          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontFamily: bodyFont, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
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
          )}
        </Panel>

        {/* Requisition status pie */}
        <Panel eyebrow="Cutting Requisitions" title="Fulfillment Status">
          {requisitionBreakdown.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              No requisitions yet.
            </div>
          ) : (
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
                          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontFamily: bodyFont, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
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
          )}
        </Panel>
      </div>
    </div>
  );
}