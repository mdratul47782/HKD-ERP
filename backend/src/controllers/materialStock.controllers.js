// backend/src/controllers/materialStock.controllers.js

import { db, schema } from "../db/db.js";
import { eq, asc } from "drizzle-orm";

const { materialReceives, materialReceiveItems, materialReceiveStyles } = schema;

/**
 * GET /material-stock
 * Query params (all optional, partial/case-insensitive match):
 *   itemCodePdm, style, color, model, season, buyer, invoiceNo, item,
 *   warehouse, location
 *
 * Only reads batches that have been through Location Assignment
 * (status = "approved"). Every row is one Date + Item Code/PDM + Color +
 * Location batch — nothing is merged, so two batches of the same Item
 * Code/PDM + Color + Location from different Receive dates show as two
 * rows. Ordered oldest Receive Date first (FIFO). A "summary" array gives
 * the Total Available Roll/Yds per Item Code/PDM + Color across all its
 * batches, for the headline "Total Available" figure.
 */
export const searchMaterialStock = async (req, res) => {
  try {
    const q = (v) => (v || "").toString().trim().toLowerCase();
    const { itemCodePdm, style, color, model, season, buyer, invoiceNo, item, warehouse, location } = req.query;

    const rows = await db
      .select({
        itemId: materialReceiveItems.id,
        materialReceiveId: materialReceiveItems.materialReceiveId,
        itemCodePdm: materialReceiveItems.itemCodePdm,
        color: materialReceiveItems.color,
        rollQty: materialReceiveItems.rollQty,
        yds: materialReceiveItems.yds,
        availableRoll: materialReceiveItems.availableRoll,
        availableYds: materialReceiveItems.availableYds,
        location: materialReceiveItems.location,
        date: materialReceives.date,
        invoiceNo: materialReceives.invoiceNo,
        buyer: materialReceives.buyer,
        season: materialReceives.season,
        po: materialReceives.po,
        warehouse: materialReceives.warehouse,
        item: materialReceives.item,
        buy: materialReceives.buy,
      })
      .from(materialReceiveItems)
      .innerJoin(materialReceives, eq(materialReceiveItems.materialReceiveId, materialReceives.id))
      .where(eq(materialReceiveItems.status, "approved"))
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
        if (style && !r.styles.some((s) => q(s.style).includes(q(style)))) return false;
        if (model && !r.styles.some((s) => q(s.model).includes(q(model)))) return false;
        return true;
      })
      // Keep only batches that still have stock left — zero-quantity
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

    res.json({ rows: results, summary: Array.from(summaryMap.values()) });
  } catch (error) {
    console.error("searchMaterialStock error:", error);
    res.status(500).json({ message: "Failed to search material stock" });
  }
};