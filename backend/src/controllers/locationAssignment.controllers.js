// backend/src/controllers/locationAssignment.controllers.js

import { db, schema } from "../db/db.js";
import { eq, asc, ne } from "drizzle-orm";

const { materialReceives, materialReceiveItems, materialReceiveItemLocations, stockHistory } = schema;

/**
 * GET /location-assignment
 * GET /location-assignment?search=...
 *
 * Lists every batch that still has unassigned quantity (status "pending"
 * or "partial"), joined with its parent Receive info AND its existing rack
 * allocations, so the UI can show e.g. "70 on Rack-1, 30 still unassigned".
 * Ordered oldest Receive Date first (FIFO-first assignment).
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
        unassignedRoll: materialReceiveItems.unassignedRoll,
        unassignedYds: materialReceiveItems.unassignedYds,
        status: materialReceiveItems.status,
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
      .where(ne(materialReceiveItems.status, "approved"))
      .orderBy(asc(materialReceives.date));

    const filtered = search
      ? rows.filter((r) =>
          [r.itemCodePdm, r.color, r.invoiceNo, r.buyer, r.po, r.item]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(search))
        )
      : rows;

    const itemIds = filtered.map((r) => r.itemId);
    const allocations = itemIds.length ? await db.select().from(materialReceiveItemLocations) : [];
    const byItem = allocations.reduce((acc, a) => {
      (acc[a.itemId] ||= []).push(a);
      return acc;
    }, {});

    res.json(filtered.map((r) => ({ ...r, locations: byItem[r.itemId] || [] })));
  } catch (error) {
    console.error("getPendingAssignments error:", error);
    res.status(500).json({ message: "Failed to fetch pending location assignments" });
  }
};

/**
 * Recomputes an item's status from its unassigned quantities, and cascades
 * the parent Receive's status: "approved" once every one of its item
 * batches is fully racked, "pending" otherwise (covers both pending and
 * partial siblings, since the Receive list only distinguishes fully-done
 * vs not-yet-fully-done).
 */
async function recomputeItemStatus(tx, itemId) {
  const [item] = await tx.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, itemId));
  const fullyUnassigned =
    Number(item.unassignedRoll) === Number(item.rollQty) && Number(item.unassignedYds) === Number(item.yds);
  const fullyAssigned = Number(item.unassignedRoll) === 0 && Number(item.unassignedYds) === 0;

  const status = fullyAssigned ? "approved" : fullyUnassigned ? "pending" : "partial";
  await tx
    .update(materialReceiveItems)
    .set({ status, approvedAt: status === "approved" ? new Date() : null })
    .where(eq(materialReceiveItems.id, itemId));

  const siblings = await tx
    .select()
    .from(materialReceiveItems)
    .where(eq(materialReceiveItems.materialReceiveId, item.materialReceiveId));
  const allApproved = siblings.every((s) => (s.id === itemId ? status === "approved" : s.status === "approved"));
  await tx
    .update(materialReceives)
    .set({ status: allApproved ? "approved" : "pending" })
    .where(eq(materialReceives.id, item.materialReceiveId));

  return status;
}

/**
 * POST /location-assignment/:itemId
 * Body: { location, rollQty, yds }
 *
 * Assigns PART (or all) of a batch's still-unassigned quantity to one
 * rack. Can be called multiple times against the same batch with
 * different racks to split it (e.g. 70 -> Rack-1, then later 30 -> Rack-2).
 * Also writes a "location_assignment" row to stock_history.
 */
export const assignLocation = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { location, rollQty, yds } = req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({ message: "Location/Rack is required" });
    }
    const roll = Number(rollQty) || 0;
    const y = Number(yds) || 0;
    if (roll <= 0 && y <= 0) {
      return res.status(400).json({ message: "Enter a Roll and/or Yds quantity to assign" });
    }

    const [item] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, itemId));
    if (!item) return res.status(404).json({ message: "Item/Color batch not found" });
    if (item.status === "approved") {
      return res.status(400).json({ message: "This batch is already fully assigned" });
    }
    if (roll > Number(item.unassignedRoll) || y > Number(item.unassignedYds)) {
      return res.status(400).json({
        message: `Only ${item.unassignedRoll} Roll / ${item.unassignedYds} Yds remain unassigned`,
      });
    }

    const trimmedLocation = location.trim();

    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(materialReceiveItemLocations).values({
        itemId: Number(itemId),
        materialReceiveId: item.materialReceiveId,
        location: trimmedLocation,
        rollQty: roll,
        yds: y,
        availableRoll: roll,
        availableYds: y,
      });
      const allocationId = inserted.insertId;

      await tx
        .update(materialReceiveItems)
        .set({
          unassignedRoll: Number(item.unassignedRoll) - roll,
          unassignedYds: Number(item.unassignedYds) - y,
        })
        .where(eq(materialReceiveItems.id, itemId));

      await tx.insert(stockHistory).values({
        batchId: Number(itemId),
        allocationId,
        materialReceiveId: item.materialReceiveId,
        action: "location_assignment",
        location: trimmedLocation,
        rollQty: roll,
        yds: y,
        note: `Assigned ${roll} Roll / ${y} Yds to ${trimmedLocation}`,
      });

      await recomputeItemStatus(tx, Number(itemId));
    });

    const [updatedItem] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, itemId));
    const locations = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(eq(materialReceiveItemLocations.itemId, itemId));
    res.json({ ...updatedItem, locations });
  } catch (error) {
    console.error("assignLocation error:", error);
    res.status(500).json({ message: "Failed to assign location" });
  }
};

/**
 * PATCH /location-assignment/allocation/:allocationId
 * Body: { location?, rollQty?, yds? }
 *
 * Edits an existing rack allocation (move it to a different rack, or
 * change how much sits on it). Only allowed while nothing has been issued
 * from it yet (availableRoll/Yds must still equal rollQty/yds). Writes an
 * "adjustment" row to stock_history.
 */
export const updateAllocation = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { location, rollQty, yds } = req.body;

    const [alloc] = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(eq(materialReceiveItemLocations.id, allocationId));
    if (!alloc) return res.status(404).json({ message: "Allocation not found" });
    if (Number(alloc.availableRoll) !== Number(alloc.rollQty) || Number(alloc.availableYds) !== Number(alloc.yds)) {
      return res.status(400).json({ message: "Can't edit: some of this rack's stock has already been issued" });
    }

    const [item] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, alloc.itemId));

    const newRoll = rollQty !== undefined ? Number(rollQty) : Number(alloc.rollQty);
    const newYds = yds !== undefined ? Number(yds) : Number(alloc.yds);
    const newLocation = location?.trim() || alloc.location;

    // Headroom = whatever's currently unassigned on the item PLUS what this
    // allocation already holds (since we're about to replace its old qty).
    const headroomRoll = Number(item.unassignedRoll) + Number(alloc.rollQty);
    const headroomYds = Number(item.unassignedYds) + Number(alloc.yds);
    if (newRoll > headroomRoll || newYds > headroomYds) {
      return res.status(400).json({ message: `Max available for this allocation is ${headroomRoll} Roll / ${headroomYds} Yds` });
    }
    if (newRoll < 0 || newYds < 0) {
      return res.status(400).json({ message: "Quantities can't be negative" });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(materialReceiveItemLocations)
        .set({ location: newLocation, rollQty: newRoll, yds: newYds, availableRoll: newRoll, availableYds: newYds })
        .where(eq(materialReceiveItemLocations.id, allocationId));

      await tx
        .update(materialReceiveItems)
        .set({ unassignedRoll: headroomRoll - newRoll, unassignedYds: headroomYds - newYds })
        .where(eq(materialReceiveItems.id, alloc.itemId));

      await tx.insert(stockHistory).values({
        batchId: alloc.itemId,
        allocationId: Number(allocationId),
        materialReceiveId: alloc.materialReceiveId,
        action: "adjustment",
        location: newLocation,
        rollQty: newRoll,
        yds: newYds,
        note: `Allocation edited: now ${newRoll} Roll / ${newYds} Yds at ${newLocation}`,
      });

      await recomputeItemStatus(tx, alloc.itemId);
    });

    const [updatedItem] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, alloc.itemId));
    const locations = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(eq(materialReceiveItemLocations.itemId, alloc.itemId));
    res.json({ ...updatedItem, locations });
  } catch (error) {
    console.error("updateAllocation error:", error);
    res.status(500).json({ message: "Failed to update allocation" });
  }
};

/**
 * DELETE /location-assignment/allocation/:allocationId
 *
 * Removes an allocation entirely and returns its quantity to the batch's
 * unassigned pool. Only allowed if nothing's been issued from it yet.
 * Writes an "adjustment" row to stock_history before deleting.
 */
export const deleteAllocation = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const [alloc] = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(eq(materialReceiveItemLocations.id, allocationId));
    if (!alloc) return res.status(404).json({ message: "Allocation not found" });
    if (Number(alloc.availableRoll) !== Number(alloc.rollQty) || Number(alloc.availableYds) !== Number(alloc.yds)) {
      return res.status(400).json({ message: "Can't remove: some of this rack's stock has already been issued" });
    }

    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, alloc.itemId));

      await tx.insert(stockHistory).values({
        batchId: alloc.itemId,
        allocationId: Number(allocationId),
        materialReceiveId: alloc.materialReceiveId,
        action: "adjustment",
        location: alloc.location,
        rollQty: alloc.rollQty,
        yds: alloc.yds,
        note: `Allocation removed from ${alloc.location}: ${alloc.rollQty} Roll / ${alloc.yds} Yds returned to unassigned`,
      });

      await tx.delete(materialReceiveItemLocations).where(eq(materialReceiveItemLocations.id, allocationId));

      await tx
        .update(materialReceiveItems)
        .set({
          unassignedRoll: Number(item.unassignedRoll) + Number(alloc.rollQty),
          unassignedYds: Number(item.unassignedYds) + Number(alloc.yds),
        })
        .where(eq(materialReceiveItems.id, alloc.itemId));

      await recomputeItemStatus(tx, alloc.itemId);
    });

    res.json({ message: "Allocation removed" });
  } catch (error) {
    console.error("deleteAllocation error:", error);
    res.status(500).json({ message: "Failed to delete allocation" });
  }
};