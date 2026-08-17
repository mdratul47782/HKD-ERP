// backend/src/controllers/cuttingRequisition.controllers.js
//
// Used by the CUTTING side page (Cutting -> Cutting Requisition).
// Cutting creates a Requisition here; the Material Warehouse side
// (cuttingIssue.controllers.js) reads/fulfills it.

import { db, schema } from "../db/db.js";
import { eq, like, and, inArray, desc, ne } from "drizzle-orm";

const { cuttingRequisitions, cuttingRequisitionItems, cuttingIssues } = schema;

async function getFullRequisition(id) {
  const [req_] = await db.select().from(cuttingRequisitions).where(eq(cuttingRequisitions.id, id));
  if (!req_) return null;
  const items = await db.select().from(cuttingRequisitionItems).where(eq(cuttingRequisitionItems.cuttingRequisitionId, id));
  return { ...req_, items, totalItems: items.length };
}

/**
 * GET /cutting-requisition
 * GET /cutting-requisition?buyer=...&po=...&style=...&model=...&itemCodePdm=...&color=...&floor=...&status=...
 *
 * Each field matched only against its own column, same AND-across-groups
 * pattern as GET /material-receive.
 */
export const getAllRequisitions = async (req, res) => {
  try {
    const { buyer, po, style, model, floor, status, itemCodePdm, color } = req.query;
    const has = (v) => typeof v === "string" && v.trim().length > 0;
    const term = (v) => `%${v.trim()}%`;

    const conditions = [];
    if (has(buyer)) conditions.push(like(cuttingRequisitions.buyer, term(buyer)));
    if (has(po)) conditions.push(like(cuttingRequisitions.po, term(po)));
    if (has(style)) conditions.push(like(cuttingRequisitions.style, term(style)));
    if (has(model)) conditions.push(like(cuttingRequisitions.model, term(model)));
    if (has(floor)) conditions.push(like(cuttingRequisitions.floor, term(floor)));
    if (has(status)) conditions.push(eq(cuttingRequisitions.status, status.trim()));

    let requisitions = conditions.length
      ? await db.select().from(cuttingRequisitions).where(and(...conditions)).orderBy(desc(cuttingRequisitions.createdAt))
      : await db.select().from(cuttingRequisitions).orderBy(desc(cuttingRequisitions.createdAt));

    // Item Code/PDM + Color filter -- must match on the SAME item row,
    // intersected with the parent-level filtering above.
    if (has(itemCodePdm) || has(color)) {
      const itemConditions = [];
      if (has(itemCodePdm)) itemConditions.push(like(cuttingRequisitionItems.itemCodePdm, term(itemCodePdm)));
      if (has(color)) itemConditions.push(like(cuttingRequisitionItems.color, term(color)));
      const matchingItemRows = await db
        .select({ cuttingRequisitionId: cuttingRequisitionItems.cuttingRequisitionId })
        .from(cuttingRequisitionItems)
        .where(and(...itemConditions));
      const okIds = new Set(matchingItemRows.map((r) => r.cuttingRequisitionId));
      requisitions = requisitions.filter((r) => okIds.has(r.id));
    }

    const ids = requisitions.map((r) => r.id);
    const allItems = ids.length
      ? await db.select().from(cuttingRequisitionItems).where(inArray(cuttingRequisitionItems.cuttingRequisitionId, ids))
      : [];

    res.json(
      requisitions.map((r) => {
        const items = allItems.filter((i) => i.cuttingRequisitionId === r.id);
        return { ...r, items, totalItems: items.length };
      })
    );
  } catch (error) {
    console.error("getAllRequisitions error:", error);
    res.status(500).json({ message: "Failed to fetch cutting requisitions" });
  }
};

/** GET /cutting-requisition/:id */
export const getRequisitionById = async (req, res) => {
  try {
    const full = await getFullRequisition(req.params.id);
    if (!full) return res.status(404).json({ message: "Requisition not found" });
    res.json(full);
  } catch (error) {
    console.error("getRequisitionById error:", error);
    res.status(500).json({ message: "Failed to fetch requisition" });
  }
};

/**
 * POST /cutting-requisition
 * Body: { date, buyer, floor, season, po, style, model,
 *         items: [{ itemCodePdm, color, requestedRoll, requestedYds }] }
 *
 * Always created fresh with isRead=false so it immediately shows up as an
 * unread notification on the Material Warehouse's Cutting Issue page.
 */
export const createRequisition = async (req, res) => {
  try {
    const { date, buyer, floor, season, po, style, model, items } = req.body;

    if (!date || !buyer || !floor || !season || !po || !style) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one Item Code/PDM + Color row is required" });
    }
    for (const row of items) {
      if (!row.itemCodePdm || !row.color || Number(row.requestedRoll) <= 0 || Number(row.requestedYds) <= 0) {
        return res.status(400).json({ message: "Every item row needs an Item Code/PDM, Color, and Roll/Yds greater than 0" });
      }
    }

    const newId = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(cuttingRequisitions).values({
        date, buyer, floor, season, po, style, model: model || null,
        status: "pending", isRead: false,
      });
      const cuttingRequisitionId = inserted.insertId;

      const itemRows = items.map((row) => ({
        cuttingRequisitionId,
        itemCodePdm: row.itemCodePdm,
        color: row.color,
        requestedRoll: Number(row.requestedRoll) || 0,
        requestedYds: row.requestedYds || 0,
        issuedRoll: 0,
        issuedYds: 0,
        status: "pending",
      }));
      await tx.insert(cuttingRequisitionItems).values(itemRows);

      return cuttingRequisitionId;
    });

    res.status(201).json(await getFullRequisition(newId));
  } catch (error) {
    console.error("createRequisition error:", error);
    res.status(500).json({ message: "Failed to create cutting requisition" });
  }
};

/**
 * PATCH /cutting-requisition/:id
 * Replaces items (delete pending, reinsert), same guard pattern as
 * Material Receive: blocked once ANY item already has something issued
 * against it, since editing here deletes+recreates rows and would
 * orphan/duplicate issue history otherwise.
 */
export const updateRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, buyer, floor, season, po, style, model, items } = req.body;

    const [existing] = await db.select().from(cuttingRequisitions).where(eq(cuttingRequisitions.id, id));
    if (!existing) return res.status(404).json({ message: "Requisition not found" });

    const issuedItems = await db
      .select()
      .from(cuttingRequisitionItems)
      .where(and(eq(cuttingRequisitionItems.cuttingRequisitionId, id), ne(cuttingRequisitionItems.status, "pending")));
    if (issuedItems.length > 0) {
      return res.status(400).json({
        message: "Some items on this requisition already have material issued against them; it can no longer be edited here.",
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(cuttingRequisitions)
        .set({ date, buyer, floor, season, po, style, model: model || null })
        .where(eq(cuttingRequisitions.id, id));

      await tx
        .delete(cuttingRequisitionItems)
        .where(and(eq(cuttingRequisitionItems.cuttingRequisitionId, id), eq(cuttingRequisitionItems.status, "pending")));

      if (Array.isArray(items) && items.length > 0) {
        const itemRows = items.map((row) => ({
          cuttingRequisitionId: Number(id),
          itemCodePdm: row.itemCodePdm,
          color: row.color,
          requestedRoll: Number(row.requestedRoll) || 0,
          requestedYds: row.requestedYds || 0,
          issuedRoll: 0,
          issuedYds: 0,
          status: "pending",
        }));
        await tx.insert(cuttingRequisitionItems).values(itemRows);
      }
    });

    res.json(await getFullRequisition(id));
  } catch (error) {
    console.error("updateRequisition error:", error);
    res.status(500).json({ message: "Failed to update cutting requisition" });
  }
};

/**
 * DELETE /cutting-requisition/:id
 * Blocked once any item already has material issued against it.
 */
export const deleteRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(cuttingRequisitions).where(eq(cuttingRequisitions.id, id));
    if (!existing) return res.status(404).json({ message: "Requisition not found" });

    const issuedItems = await db
      .select()
      .from(cuttingRequisitionItems)
      .where(and(eq(cuttingRequisitionItems.cuttingRequisitionId, id), ne(cuttingRequisitionItems.status, "pending")));
    if (issuedItems.length > 0) {
      return res.status(400).json({ message: "Cannot delete: material has already been issued against this requisition." });
    }

    await db.delete(cuttingRequisitions).where(eq(cuttingRequisitions.id, id));
    res.json({ message: "Cutting requisition deleted successfully" });
  } catch (error) {
    console.error("deleteRequisition error:", error);
    res.status(500).json({ message: "Failed to delete cutting requisition" });
  }
};