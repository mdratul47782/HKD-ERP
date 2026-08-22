// backend/src/controllers/buyerDashboard.controllers.js
//
// BRAND NEW, STANDALONE controller for the "Buyer Overview" white
// dashboard. It does not modify or import from dashboard.controllers.js
// (the existing dark rack-view dashboard) -- it just reads the same
// tables independently, in JS, the same style as every other controller
// in this codebase.
//
// Powers a single GET endpoint that gives the frontend everything it
// needs in one call:
//   kpis              -> headline numbers (Total Available Roll/Yds,
//                         Pending Inspection count, Total Receiving count)
//   buyerStock         -> Available Roll/Yds summed per Buyer (bar chart)
//   statusBreakdown    -> batch counts per material_receive_items.status
//                         (pie chart)
//   requisitionBreakdown -> cutting_requisitions counts per status
//                         (pie chart)
//
// Nothing here writes to the database -- pure read + aggregate, same as
// the existing materialRackView controller.

import { db, schema } from "../db/db.js";

const {
  materialReceives,
  materialReceiveItems,
  materialReceiveItemLocations,
  cuttingRequisitions,
} = schema;

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * GET /dashboard/buyer-overview
 */
export const buyerOverview = async (req, res) => {
  try {
    const [receives, items, locations, requisitions] = await Promise.all([
      db.select().from(materialReceives),
      db.select().from(materialReceiveItems),
      db.select().from(materialReceiveItemLocations),
      db.select().from(cuttingRequisitions),
    ]);

    const receiveById = new Map(receives.map((r) => [r.id, r]));
    const itemById = new Map(items.map((i) => [i.id, i]));

    // ---------------- KPIs ----------------
    const totalAvailableYds = locations.reduce((s, l) => s + Number(l.availableYds), 0);
    const totalAvailableRoll = locations.reduce((s, l) => s + Number(l.availableRoll), 0);
    const pendingInspectionCount = items.filter((i) => i.status === "pending_inspection").length;
    // "Receiving koyta" -- total number of Material Receive (invoice)
    // records ever created, regardless of their current status.
    const totalReceivingCount = receives.length;

    // ---------------- Available stock by Buyer (Roll + Yds) ----------------
    // via location -> its batch -> that batch's parent Receive.buyer
    const buyerTotals = new Map(); // buyer -> { roll, yds }
    for (const loc of locations) {
      const item = itemById.get(loc.itemId);
      const receive = item ? receiveById.get(item.materialReceiveId) : null;
      const buyer = receive?.buyer || "Unknown";
      const cur = buyerTotals.get(buyer) || { buyer, roll: 0, yds: 0 };
      cur.roll += Number(loc.availableRoll);
      cur.yds += Number(loc.availableYds);
      buyerTotals.set(buyer, cur);
    }
    const buyerStock = Array.from(buyerTotals.values())
      .map((b) => ({ buyer: b.buyer, roll: round2(b.roll), yds: round2(b.yds) }))
      .sort((a, b) => b.yds - a.yds);

    // ---------------- Batch status breakdown (pie) ----------------
    const STATUS_ORDER = ["approved", "partial", "pending", "pending_inspection", "rejected"];
    const statusBreakdown = STATUS_ORDER.map((status) => ({
      status,
      count: items.filter((i) => i.status === status).length,
    })).filter((s) => s.count > 0);

    // ---------------- Cutting requisition breakdown (pie) ----------------
    const REQ_STATUS_ORDER = ["pending", "partial", "fulfilled"];
    const requisitionBreakdown = REQ_STATUS_ORDER.map((status) => ({
      status,
      count: requisitions.filter((r) => r.status === status).length,
    })).filter((s) => s.count > 0);

    res.json({
      kpis: {
        totalAvailableYds: round2(totalAvailableYds),
        totalAvailableRoll,
        pendingInspectionCount,
        totalReceivingCount,
      },
      buyerStock,
      statusBreakdown,
      requisitionBreakdown,
    });
  } catch (error) {
    console.error("buyerOverview error:", error);
    res.status(500).json({ message: "Failed to load buyer dashboard overview" });
  }
};