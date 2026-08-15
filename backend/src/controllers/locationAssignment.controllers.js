// backend/src/controllers/locationAssignment.controllers.js

import { db, schema } from "../db/db.js";
import { eq, asc } from "drizzle-orm";

const { materialReceives, materialReceiveItems } = schema;

/**
 * GET /location-assignment
 * GET /location-assignment?search=...
 *
 * Lists every Item Code/PDM + Color batch still waiting for a
 * Location/Rack (status = "pending"), joined with its parent Receive info,
 * ordered oldest Receive Date first (so users naturally assign FIFO-first).
 */
export const getPendingAssignments = async (req, res) => {
  try {
    const search = req.query.search?.trim()?.toLowerCase();

    const rows = await db
      .select({
        itemId: materialReceiveItems.id,
        materialReceiveId: materialReceiveItems.materialReceiveId,
        itemCodePdm: materialReceiveItems.itemCodePdm,
        color: materialReceiveItems.color,
        rollQty: materialReceiveItems.rollQty,
        yds: materialReceiveItems.yds,
        date: materialReceives.date,
        invoiceNo: materialReceives.invoiceNo,
        buyer: materialReceives.buyer,
        season: materialReceives.season,
        po: materialReceives.po,
        warehouse: materialReceives.warehouse,
        item: materialReceives.item,
      })
      .from(materialReceiveItems)
      .innerJoin(materialReceives, eq(materialReceiveItems.materialReceiveId, materialReceives.id))
      .where(eq(materialReceiveItems.status, "pending"))
      .orderBy(asc(materialReceives.date));

    const filtered = search
      ? rows.filter((r) =>
          [r.itemCodePdm, r.color, r.invoiceNo, r.buyer, r.po, r.item]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(search))
        )
      : rows;

    res.json(filtered);
  } catch (error) {
    console.error("getPendingAssignments error:", error);
    res.status(500).json({ message: "Failed to fetch pending location assignments" });
  }
};

/**
 * PATCH /location-assignment/:itemId
 * Body: { location }
 *
 * Approves ONE Item Code/PDM + Color batch: sets its Location/Rack and
 * flips its status to "approved". Different Colors of the same Item
 * Code/PDM can get different Locations because this acts on one batch row
 * at a time, and two batches sharing Item Code/PDM + Color + Location stay
 * as separate rows if they came from different Receive dates.
 *
 * Once every batch under a Receive is approved, the parent Receive's own
 * status flips to "approved" too (for display/list filtering).
 */
export const assignLocation = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({ message: "Location/Rack is required" });
    }

    const [item] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, itemId));
    if (!item) return res.status(404).json({ message: "Item/Color batch not found" });
    if (item.status === "approved") {
      return res.status(400).json({ message: "This batch already has an assigned location" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(materialReceiveItems)
        .set({ location: location.trim(), status: "approved", approvedAt: new Date() })
        .where(eq(materialReceiveItems.id, itemId));

      const siblings = await tx
        .select()
        .from(materialReceiveItems)
        .where(eq(materialReceiveItems.materialReceiveId, item.materialReceiveId));

      const allApproved = siblings.every((s) => (s.id === Number(itemId) ? true : s.status === "approved"));
      if (allApproved) {
        await tx
          .update(materialReceives)
          .set({ status: "approved" })
          .where(eq(materialReceives.id, item.materialReceiveId));
      }
    });

    const [updated] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, itemId));
    res.json(updated);
  } catch (error) {
    console.error("assignLocation error:", error);
    res.status(500).json({ message: "Failed to assign location" });
  }
};