// backend/src/controllers/materialStock.controllers.js

import { asc, eq } from "drizzle-orm";
import { db, schema } from "../db/db.js";

const { materialReceives, materialReceiveItems, materialReceiveItemLocations, materialReceiveStyles } = schema;

/**
 * GET /material-stock
 * Query params (all optional, partial/case-insensitive match):
 *   itemCodePdm, style, color, model, season, buyer, invoiceNo, item,
 *   warehouse, location, supplier, fabricDetails
 *
 * Reads from the rack allocations table (material_receive_item_locations),
 * NOT the batch table — so every row here is one Date + Item Code/PDM +
 * Color + Rack combination. A batch split across two racks now shows as
 * two rows, each with its own Roll/Yds and Available Roll/Yds, which is
 * exactly "which rack has how many rolls, and how many are still
 * available". Ordered oldest Receive Date first (FIFO). A "summary" array
 * gives Total Available Roll/Yds per Item Code/PDM + Color across ALL its
 * racks combined, for the headline "Total Available" figure.
 *
 * Supplier (invoice/parent-level) and Fabric Details (item/batch-level) are
 * both included in every row and are filterable the same way as the other
 * fields, so the frontend can search/display them without changing what
 * columns show by default.
 *
 * VISIBILITY POLICY: this endpoint used to hide any rack allocation with
 * availableRoll <= 0 AND availableYds <= 0, on the theory that "0 stock
 * isn't really stock". That silently hid rows that DO exist in the DB --
 * including legacy-import rows where the sheet's INHAND value was
 * genuinely 0, or even NEGATIVE (accounting-format cells like "(40)",
 * meaning -40, which happens when a sheet records more issued than was
 * ever received). Since the whole import pipeline's rule is "whatever's
 * in the sheet is exactly what lands in DB and stays visible", that
 * filter contradicted the data it was hiding. It has been removed --
 * EVERY rack allocation row now always shows up here, exactly as stored.
 * A `hasStock` boolean is added to each row (true only when
 * availableRoll > 0 OR availableYds > 0) so the frontend can badge
 * zero/negative rows distinctly (e.g. "No stock" / "Adjustment") instead
 * of presenting them as normal available inventory.
 */
export const searchMaterialStock = async (req, res) => {
  try {
    const q = (v) => (v || "").toString().trim().toLowerCase();
    const { itemCodePdm, style, color, model, season, buyer, invoiceNo, item, warehouse, location, supplier, fabricDetails } = req.query;

    const rows = await db
      .select({
        allocationId: materialReceiveItemLocations.id,
        batchItemId: materialReceiveItems.id,
        materialReceiveId: materialReceiveItems.materialReceiveId,
        itemCodePdm: materialReceiveItems.itemCodePdm,
        color: materialReceiveItems.color,
        fabricDetails: materialReceiveItems.fabricDetails,
        rollQty: materialReceiveItemLocations.rollQty, // roll placed on THIS rack
        yds: materialReceiveItemLocations.yds, // yds placed on THIS rack
        availableRoll: materialReceiveItemLocations.availableRoll,
        availableYds: materialReceiveItemLocations.availableYds,
        location: materialReceiveItemLocations.location,
        date: materialReceives.date,
        invoiceNo: materialReceives.invoiceNo,
        buyer: materialReceives.buyer,
        season: materialReceives.season,
        po: materialReceives.po,
        warehouse: materialReceives.warehouse,
        item: materialReceives.item,
        buy: materialReceives.buy,
        supplier: materialReceives.supplier,
      })
      .from(materialReceiveItemLocations)
      .innerJoin(materialReceiveItems, eq(materialReceiveItemLocations.itemId, materialReceiveItems.id))
      .innerJoin(materialReceives, eq(materialReceiveItems.materialReceiveId, materialReceives.id))
      .orderBy(asc(materialReceives.date));

    const styleRows = await db.select().from(materialReceiveStyles);
    const stylesByReceive = styleRows.reduce((acc, s) => {
      (acc[s.materialReceiveId] ||= []).push(s);
      return acc;
    }, {});

    const results = rows
      .map((r) => ({ ...r, styles: stylesByReceive[r.materialReceiveId] || [] }))
      .filter((r) => {
        if (itemCodePdm && !q(r.itemCodePdm).includes(q(itemCodePdm))) return false;
        if (color && !q(r.color).includes(q(color))) return false;
        if (season && !q(r.season).includes(q(season))) return false;
        if (buyer && !q(r.buyer).includes(q(buyer))) return false;
        if (invoiceNo && !q(r.invoiceNo).includes(q(invoiceNo))) return false;
        if (item && !q(r.item).includes(q(item))) return false;
        if (warehouse && !q(r.warehouse).includes(q(warehouse))) return false;
        if (location && !q(r.location).includes(q(location))) return false;
        if (supplier && !q(r.supplier).includes(q(supplier))) return false;
        if (fabricDetails && !q(r.fabricDetails).includes(q(fabricDetails))) return false;
        if (style && !r.styles.some((s) => q(s.style).includes(q(style)))) return false;
        if (model && !r.styles.some((s) => q(s.model).includes(q(model)))) return false;
        return true;
      });
      // NOTE: the old ".filter((r) => Number(r.availableRoll) > 0 ||
      // Number(r.availableYds) > 0)" step that used to sit here has been
      // removed on purpose -- every rack allocation is shown now,
      // including 0 and negative available quantities, since those are
      // real rows in the DB and hiding them contradicted the "exact
      // sheet data, always visible" import policy.

    const summaryMap = new Map();
    for (const r of results) {
      const key = `${r.itemCodePdm}||${r.color}`;
      const cur = summaryMap.get(key) || {
        itemCodePdm: r.itemCodePdm,
        color: r.color,
        totalAvailableRoll: 0,
        totalAvailableYds: 0,
      };
      cur.totalAvailableRoll += Number(r.availableRoll);
      cur.totalAvailableYds += Number(r.availableYds);
      summaryMap.set(key, cur);
    }

    // itemId in the response = allocationId, so the frontend (which keys
    // table rows off r.itemId) gets a unique key per rack row, and each
    // row's Roll/Yds/Available already reflect that specific rack.
    //
    // hasStock: true only when this specific rack row actually has
    // positive available quantity. false covers both "0 available" and
    // "negative available" (an over-issued/adjustment row) -- the
    // frontend can use this to show a "No stock" / "Adjustment" badge
    // instead of presenting the row as normal available inventory, while
    // still keeping it visible and searchable.
    res.json({
      rows: results.map((r) => ({
        ...r,
        itemId: r.allocationId,
        hasStock: Number(r.availableRoll) > 0 || Number(r.availableYds) > 0,
      })),
      summary: Array.from(summaryMap.values()),
    });
  } catch (error) {
    console.error("searchMaterialStock error:", error);
    res.status(500).json({ message: "Failed to search material stock" });
  }
};