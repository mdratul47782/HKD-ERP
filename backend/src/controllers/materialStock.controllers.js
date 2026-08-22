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
      })
      // Keep only rack allocations that still have stock left — zero-quantity
      // history stays in the DB for FIFO/audit but isn't "available stock".
      .filter((r) => Number(r.availableRoll) > 0 || Number(r.availableYds) > 0);

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
    res.json({
      rows: results.map((r) => ({ ...r, itemId: r.allocationId })),
      summary: Array.from(summaryMap.values()),
    });
  } catch (error) {
    console.error("searchMaterialStock error:", error);
    res.status(500).json({ message: "Failed to search material stock" });
  }
};