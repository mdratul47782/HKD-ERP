// backend/src/controllers/materialReceive.controllers.js

import { db, schema } from "../db/db.js";
import { eq, like, or, and, inArray } from "drizzle-orm";

const { materialReceives, materialReceiveStyles, materialReceiveItems, stockHistory } = schema;

/** Loads one Material Receive with its Style/Model rows and Item/Color batches. */
async function getFullReceive(id) {
  const [receive] = await db.select().from(materialReceives).where(eq(materialReceives.id, id));
  if (!receive) return null;
  const styles = await db.select().from(materialReceiveStyles).where(eq(materialReceiveStyles.materialReceiveId, id));
  const items = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.materialReceiveId, id));
  return { ...receive, styles, items, totalItems: items.length };
}

/**
 * GET /material-receive
 * GET /material-receive?search=INV-1001
 *
 * Returns every Material Receive with its styles[] (Style + Model) and
 * items[] (Item Code/PDM, Color, Roll, Yds, Location, status). "search"
 * checks parent fields, style/model rows, and item/color rows.
 */
export const getAllMaterialReceives = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    let receives;

    if (search) {
      const term = `%${search}%`;

      const directMatches = await db
        .select()
        .from(materialReceives)
        .where(
          or(
            like(materialReceives.invoiceNo, term),
            like(materialReceives.buyer, term),
            like(materialReceives.po, term),
            like(materialReceives.item, term)
          )
        );

      const styleMatches = await db
        .select({ materialReceiveId: materialReceiveStyles.materialReceiveId })
        .from(materialReceiveStyles)
        .where(or(like(materialReceiveStyles.style, term), like(materialReceiveStyles.model, term)));

      const itemMatches = await db
        .select({ materialReceiveId: materialReceiveItems.materialReceiveId })
        .from(materialReceiveItems)
        .where(or(like(materialReceiveItems.itemCodePdm, term), like(materialReceiveItems.color, term)));

      const idsFromChildren = [...styleMatches, ...itemMatches].map((r) => r.materialReceiveId);
      const receivesFromChildren = idsFromChildren.length
        ? await db.select().from(materialReceives).where(inArray(materialReceives.id, idsFromChildren))
        : [];

      const merged = [...directMatches, ...receivesFromChildren];
      receives = Array.from(new Map(merged.map((r) => [r.id, r])).values());
    } else {
      receives = await db.select().from(materialReceives);
    }

    const receiveIds = receives.map((r) => r.id);
    const allStyles = receiveIds.length
      ? await db.select().from(materialReceiveStyles).where(inArray(materialReceiveStyles.materialReceiveId, receiveIds))
      : [];
    const allItems = receiveIds.length
      ? await db.select().from(materialReceiveItems).where(inArray(materialReceiveItems.materialReceiveId, receiveIds))
      : [];

    const withDetails = receives.map((r) => {
      const styles = allStyles.filter((s) => s.materialReceiveId === r.id);
      const items = allItems.filter((i) => i.materialReceiveId === r.id);
      return { ...r, styles, items, totalItems: items.length };
    });

    res.json(withDetails);
  } catch (error) {
    console.error("getAllMaterialReceives error:", error);
    res.status(500).json({ message: "Failed to fetch material receives" });
  }
};

/**
 * GET /material-receive/:id
 */
export const getMaterialReceiveById = async (req, res) => {
  try {
    const full = await getFullReceive(req.params.id);
    if (!full) return res.status(404).json({ message: "Material receive not found" });
    res.json(full);
  } catch (error) {
    console.error("getMaterialReceiveById error:", error);
    res.status(500).json({ message: "Failed to fetch material receive" });
  }
};

/**
 * POST /material-receive
 * Body: { date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy,
 *         styles: [{ style, model }],
 *         items: [{ itemCodePdm, color, rollQty, yds }] }
 *
 * NOTE: Location/Rack is intentionally never accepted here. Every item row
 * is created as status "pending" with no location — that only happens on
 * the Location Assignment page. The whole record starts "pending" too.
 *
 * Every batch created also gets a "receive" row in stock_history, so the
 * ledger has a record of it entering the system before any location is
 * ever assigned (needed for future FIFO / batch auditing in Cutting Issue).
 */
export const createMaterialReceive = async (req, res) => {
  try {
    const { date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy, styles, items } = req.body;

    if (!date || !invoiceNo || !fromType || !warehouse || !buyer || !season || !po || !item || !buy) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!Array.isArray(styles) || styles.filter((s) => s?.style).length === 0) {
      return res.status(400).json({ message: "At least one Style (with its Model) is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one Item Code/PDM + Color row is required" });
    }

    // Transaction: parent + styles + item batches + history succeed together or not at all.
    const newId = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(materialReceives).values({
        date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy, status: "pending",
      });
      const materialReceiveId = inserted.insertId;

      const styleRows = styles
        .filter((s) => s?.style)
        .map((s) => ({ materialReceiveId, style: s.style, model: s.model || null }));
      await tx.insert(materialReceiveStyles).values(styleRows);

      const itemRows = items.map((row) => {
        const rollQty = Number(row.rollQty) || 0;
        const yds = row.yds || 0;
        return {
          materialReceiveId,
          itemCodePdm: row.itemCodePdm,
          color: row.color,
          rollQty,
          yds,
          availableRoll: rollQty, // batch starts fully available; Cutting Issue will decrement this later
          availableYds: yds,
          location: null,
          status: "pending",
        };
      });
      await tx.insert(materialReceiveItems).values(itemRows);

      // Read the batches back so we have their real ids for the history ledger.
      const insertedBatches = await tx
        .select()
        .from(materialReceiveItems)
        .where(eq(materialReceiveItems.materialReceiveId, materialReceiveId));

      if (insertedBatches.length) {
        const historyRows = insertedBatches.map((batch) => ({
          batchId: batch.id,
          materialReceiveId,
          action: "receive",
          location: null,
          rollQty: batch.rollQty,
          yds: batch.yds,
          note: `Received via invoice ${invoiceNo}`,
        }));
        await tx.insert(stockHistory).values(historyRows);
      }

      return materialReceiveId;
    });

    res.status(201).json(await getFullReceive(newId));
  } catch (error) {
    console.error("createMaterialReceive error:", error);
    res.status(500).json({ message: "Failed to create material receive" });
  }
};

/**
 * PATCH /material-receive/:id
 * Replaces styles + item batches, same "delete old, insert new" approach
 * as before — but only while the record is still pending. Once every batch
 * has a location assigned (status = "approved" on the parent), the record
 * is locked from editing here; changes at that point belong to stock
 * correction tooling, not the Receive form.
 *
 * Any pending batch that gets deleted here has its stock_history rows
 * cascade-deleted with it (FK ON DELETE CASCADE), and every newly inserted
 * replacement batch gets its own fresh "receive" history row, so the
 * ledger always matches what's actually pending right now.
 */
export const updateMaterialReceive = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy, styles, items } = req.body;

    const [existing] = await db.select().from(materialReceives).where(eq(materialReceives.id, id));
    if (!existing) return res.status(404).json({ message: "Material receive not found" });
    if (existing.status === "approved") {
      return res.status(400).json({
        message: "This receive is fully approved and already has locations assigned; it can no longer be edited here.",
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(materialReceives)
        .set({ date, invoiceNo, fromType, warehouse, buyer, season, po, item, buy })
        .where(eq(materialReceives.id, id));

      await tx.delete(materialReceiveStyles).where(eq(materialReceiveStyles.materialReceiveId, id));
      const styleRows = (Array.isArray(styles) ? styles : [])
        .filter((s) => s?.style)
        .map((s) => ({ materialReceiveId: Number(id), style: s.style, model: s.model || null }));
      if (styleRows.length) await tx.insert(materialReceiveStyles).values(styleRows);

      // Only pending batches are replaced — any batch that already has a
      // location assigned (status "approved") is left untouched.
      await tx
        .delete(materialReceiveItems)
        .where(and(eq(materialReceiveItems.materialReceiveId, id), eq(materialReceiveItems.status, "pending")));

      if (Array.isArray(items) && items.length > 0) {
        const itemRows = items.map((row) => {
          const rollQty = Number(row.rollQty) || 0;
          const yds = row.yds || 0;
          return {
            materialReceiveId: Number(id),
            itemCodePdm: row.itemCodePdm,
            color: row.color,
            rollQty,
            yds,
            availableRoll: rollQty,
            availableYds: yds,
            location: null,
            status: "pending",
          };
        });
        await tx.insert(materialReceiveItems).values(itemRows);

        const insertedBatches = await tx
          .select()
          .from(materialReceiveItems)
          .where(and(eq(materialReceiveItems.materialReceiveId, Number(id)), eq(materialReceiveItems.status, "pending")));

        if (insertedBatches.length) {
          const historyRows = insertedBatches.map((batch) => ({
            batchId: batch.id,
            materialReceiveId: Number(id),
            action: "receive",
            location: null,
            rollQty: batch.rollQty,
            yds: batch.yds,
            note: `Updated via invoice ${invoiceNo}`,
          }));
          await tx.insert(stockHistory).values(historyRows);
        }
      }
    });

    res.json(await getFullReceive(id));
  } catch (error) {
    console.error("updateMaterialReceive error:", error);
    res.status(500).json({ message: "Failed to update material receive" });
  }
};

/**
 * DELETE /material-receive/:id
 * Blocked once any item batch already has a location/stock assigned, so a
 * Receive can't be deleted out from under stock that Location Assignment
 * (or, later, Cutting Issue) already relies on.
 */
export const deleteMaterialReceive = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(materialReceives).where(eq(materialReceives.id, id));
    if (!existing) return res.status(404).json({ message: "Material receive not found" });

    const approvedItems = await db
      .select()
      .from(materialReceiveItems)
      .where(and(eq(materialReceiveItems.materialReceiveId, id), eq(materialReceiveItems.status, "approved")));

    if (approvedItems.length > 0) {
      return res.status(400).json({
        message: "Cannot delete: some batches already have an assigned location. Remove them from stock first.",
      });
    }

    await db.delete(materialReceives).where(eq(materialReceives.id, id));
    res.json({ message: "Material receive deleted successfully" });
  } catch (error) {
    console.error("deleteMaterialReceive error:", error);
    res.status(500).json({ message: "Failed to delete material receive" });
  }
};