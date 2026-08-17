// backend/src/controllers/cuttingIssue.controllers.js
//
// Used by the MATERIAL WAREHOUSE side page (Material-warehouse -> Cutting
// Issue). Shows incoming Requisitions from Cutting as notifications
// (bell icon, read/unread), lets the warehouse user issue stock against
// them from a specific rack (decrementing the SAME
// material_receive_item_locations.availableRoll/Yds that Material Stock
// reads from), and keeps a History ledger of every issue action.

import { db, schema } from "../db/db.js";
import { eq, desc, ne, inArray } from "drizzle-orm";

const {
  cuttingRequisitions,
  cuttingRequisitionItems,
  cuttingIssues,
  materialReceiveItems,
  materialReceiveItemLocations,
  materialReceives,
  stockHistory,
} = schema;

async function attachItems(requisitions) {
  const ids = requisitions.map((r) => r.id);
  const allItems = ids.length
    ? await db.select().from(cuttingRequisitionItems).where(inArray(cuttingRequisitionItems.cuttingRequisitionId, ids))
    : [];
  return requisitions.map((r) => ({
    ...r,
    items: allItems.filter((i) => i.cuttingRequisitionId === r.id),
  }));
}

/**
 * GET /cutting-issue/notifications
 *
 * Returns { unreadCount, notifications: [...] } -- unread first, then
 * newest first. Used to drive the bell icon + dropdown.
 */
export const getNotifications = async (req, res) => {
  try {
    const rows = await db.select().from(cuttingRequisitions).orderBy(desc(cuttingRequisitions.createdAt));
    const withItems = await attachItems(rows);
    const unreadCount = withItems.filter((r) => !r.isRead).length;
    const sorted = withItems
      .slice()
      .sort((a, b) => (a.isRead === b.isRead ? 0 : a.isRead ? 1 : -1));
    res.json({ unreadCount, notifications: sorted });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/** PATCH /cutting-issue/:requisitionId/read -- marks one requisition read. */
export const markRequisitionRead = async (req, res) => {
  try {
    const { requisitionId } = req.params;
    await db.update(cuttingRequisitions).set({ isRead: true }).where(eq(cuttingRequisitions.id, requisitionId));
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error("markRequisitionRead error:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
};

/**
 * GET /cutting-issue
 * GET /cutting-issue?search=...
 *
 * Main worklist for the Cutting Issue page: every requisition that isn't
 * fully fulfilled yet, newest first, with its item rows (requested /
 * issued / remaining). Rack-wise available stock for a given Item
 * Code/PDM + Color is fetched separately by the frontend via the existing
 * GET /material-stock?itemCodePdm=...&color=... endpoint, so this
 * controller doesn't duplicate that lookup.
 */
export const getWorklist = async (req, res) => {
  try {
    const search = req.query.search?.trim()?.toLowerCase();
    let rows = await db
      .select()
      .from(cuttingRequisitions)
      .where(ne(cuttingRequisitions.status, "fulfilled"))
      .orderBy(desc(cuttingRequisitions.createdAt));

    const withItems = await attachItems(rows);

    const filtered = search
      ? withItems.filter((r) =>
          [r.buyer, r.po, r.style, r.model, r.floor, ...r.items.flatMap((i) => [i.itemCodePdm, i.color])]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(search))
        )
      : withItems;

    res.json(filtered);
  } catch (error) {
    console.error("getWorklist error:", error);
    res.status(500).json({ message: "Failed to fetch cutting issue worklist" });
  }
};

/**
 * GET /cutting-issue/history
 *
 * Every issue action ever made, newest first, joined with its Requisition
 * Item + parent Requisition context, for the "History" tab.
 */
export const getIssueHistory = async (req, res) => {
  try {
    const rows = await db
      .select({
        id: cuttingIssues.id,
        requisitionItemId: cuttingIssues.requisitionItemId,
        cuttingRequisitionId: cuttingIssues.cuttingRequisitionId,
        allocationId: cuttingIssues.allocationId,
        itemId: cuttingIssues.itemId,
        location: cuttingIssues.location,
        rollQty: cuttingIssues.rollQty,
        yds: cuttingIssues.yds,
        createdAt: cuttingIssues.createdAt,
        itemCodePdm: cuttingRequisitionItems.itemCodePdm,
        color: cuttingRequisitionItems.color,
        date: cuttingRequisitions.date,
        buyer: cuttingRequisitions.buyer,
        floor: cuttingRequisitions.floor,
        season: cuttingRequisitions.season,
        po: cuttingRequisitions.po,
        style: cuttingRequisitions.style,
        model: cuttingRequisitions.model,
      })
      .from(cuttingIssues)
      .innerJoin(cuttingRequisitionItems, eq(cuttingIssues.requisitionItemId, cuttingRequisitionItems.id))
      .innerJoin(cuttingRequisitions, eq(cuttingIssues.cuttingRequisitionId, cuttingRequisitions.id))
      .orderBy(desc(cuttingIssues.createdAt));

    res.json(rows);
  } catch (error) {
    console.error("getIssueHistory error:", error);
    res.status(500).json({ message: "Failed to fetch issue history" });
  }
};

/**
 * Recomputes a requisition item's status from issued vs requested, and
 * cascades the parent requisition's status: "fulfilled" once every item
 * is fully issued, "pending" if nothing on the requisition has been
 * touched yet, "partial" otherwise.
 */
async function recomputeRequisitionStatus(tx, requisitionItemId) {
  const [item] = await tx
    .select()
    .from(cuttingRequisitionItems)
    .where(eq(cuttingRequisitionItems.id, requisitionItemId));

  const fullyIssued =
    Number(item.issuedRoll) === Number(item.requestedRoll) && Number(item.issuedYds) === Number(item.requestedYds);
  const nothingIssued = Number(item.issuedRoll) === 0 && Number(item.issuedYds) === 0;
  const status = fullyIssued ? "fulfilled" : nothingIssued ? "pending" : "partial";

  await tx
    .update(cuttingRequisitionItems)
    .set({ status, fulfilledAt: status === "fulfilled" ? new Date() : null })
    .where(eq(cuttingRequisitionItems.id, requisitionItemId));

  const siblings = await tx
    .select()
    .from(cuttingRequisitionItems)
    .where(eq(cuttingRequisitionItems.cuttingRequisitionId, item.cuttingRequisitionId));
  const effective = siblings.map((s) => (s.id === requisitionItemId ? status : s.status));
  const requisitionStatus = effective.every((s) => s === "fulfilled")
    ? "fulfilled"
    : effective.every((s) => s === "pending")
    ? "pending"
    : "partial";

  await tx
    .update(cuttingRequisitions)
    .set({ status: requisitionStatus })
    .where(eq(cuttingRequisitions.id, item.cuttingRequisitionId));

  return status;
}

/**
 * POST /cutting-issue/:requisitionItemId
 * Body: { allocationId, rollQty, yds }
 *
 * Issues PART (or all) of a requisition item's still-remaining quantity
 * from ONE specific rack allocation. Can be called multiple times against
 * the same requisition item with different allocations (splitting across
 * racks) and/or on different days (partial issue over time).
 *
 * This decrements the SAME material_receive_item_locations.availableRoll/
 * Yds that Material Stock search reads from -- i.e. this is the actual
 * "minus from stock" step. Also logs to cutting_issues (this module's own
 * History) and to stock_history (action "issue") so the master ledger
 * used by Location Assignment/FIFO stays consistent.
 */
export const issueStock = async (req, res) => {
  try {
    const { requisitionItemId } = req.params;
    const { allocationId, rollQty, yds } = req.body;

    if (!allocationId) return res.status(400).json({ message: "Select a Rack to issue from" });
    const roll = Number(rollQty) || 0;
    const y = Number(yds) || 0;
    if (roll <= 0 || y <= 0) {
      return res.status(400).json({ message: "Enter both a Roll and a Yds quantity greater than 0 to issue" });
    }

    const [reqItem] = await db.select().from(cuttingRequisitionItems).where(eq(cuttingRequisitionItems.id, requisitionItemId));
    if (!reqItem) return res.status(404).json({ message: "Requisition item not found" });
    if (reqItem.status === "fulfilled") {
      return res.status(400).json({ message: "This requisition item is already fully issued" });
    }

    const remainingRoll = Number(reqItem.requestedRoll) - Number(reqItem.issuedRoll);
    const remainingYds = Number(reqItem.requestedYds) - Number(reqItem.issuedYds);
    if (roll > remainingRoll || y > remainingYds) {
      return res.status(400).json({ message: `Only ${remainingRoll} Roll / ${remainingYds} Yds remain to be issued` });
    }

    const [allocation] = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(eq(materialReceiveItemLocations.id, allocationId));
    if (!allocation) return res.status(404).json({ message: "Rack allocation not found" });
    if (roll > Number(allocation.availableRoll) || y > Number(allocation.availableYds)) {
      return res.status(400).json({
        message: `Only ${allocation.availableRoll} Roll / ${allocation.availableYds} Yds available on ${allocation.location}`,
      });
    }

    // Sanity check: the rack must actually hold the same Item Code/PDM +
    // Color the requisition item is asking for.
    const [batch] = await db.select().from(materialReceiveItems).where(eq(materialReceiveItems.id, allocation.itemId));
    if (!batch || batch.itemCodePdm !== reqItem.itemCodePdm || batch.color !== reqItem.color) {
      return res.status(400).json({ message: "Selected rack does not hold this Item Code/PDM + Color" });
    }

    const [requisition] = await db
      .select()
      .from(cuttingRequisitions)
      .where(eq(cuttingRequisitions.id, reqItem.cuttingRequisitionId));

    await db.transaction(async (tx) => {
      await tx
        .update(materialReceiveItemLocations)
        .set({
          availableRoll: Number(allocation.availableRoll) - roll,
          availableYds: Number(allocation.availableYds) - y,
        })
        .where(eq(materialReceiveItemLocations.id, allocationId));

      await tx
        .update(cuttingRequisitionItems)
        .set({
          issuedRoll: Number(reqItem.issuedRoll) + roll,
          issuedYds: Number(reqItem.issuedYds) + y,
        })
        .where(eq(cuttingRequisitionItems.id, requisitionItemId));

      await tx.insert(cuttingIssues).values({
        requisitionItemId: Number(requisitionItemId),
        cuttingRequisitionId: reqItem.cuttingRequisitionId,
        allocationId: Number(allocationId),
        itemId: allocation.itemId,
        location: allocation.location,
        rollQty: roll,
        yds: y,
      });

      await tx.insert(stockHistory).values({
        batchId: allocation.itemId,
        allocationId: Number(allocationId),
        materialReceiveId: allocation.materialReceiveId,
        action: "issue",
        location: allocation.location,
        rollQty: roll,
        yds: y,
        note: `Issued ${roll} Roll / ${y} Yds to Cutting (PO ${requisition?.po ?? ""}, Floor ${requisition?.floor ?? ""}) from ${allocation.location}`,
      });

      await recomputeRequisitionStatus(tx, Number(requisitionItemId));
    });

    const [updatedItem] = await db.select().from(cuttingRequisitionItems).where(eq(cuttingRequisitionItems.id, requisitionItemId));
    res.json(updatedItem);
  } catch (error) {
    console.error("issueStock error:", error);
    res.status(500).json({ message: "Failed to issue stock" });
  }
};

/**
 * POST /cutting-issue/:requisitionItemId/batch
 * Body: { allocations: [{ allocationId, rollQty, yds }, ...] }
 *
 * MULTI-RACK issue in one action: the warehouse user can pick several
 * racks at once (e.g. 40 Roll from Rack-1 + 30 Roll from Rack-3) and issue
 * all of them together instead of repeating the single-rack call. All
 * rows are validated up front and applied in ONE transaction -- either
 * every row succeeds or none of them do, so stock can't end up half
 * decremented if row 2 turns out invalid.
 *
 * Same rules as the single-rack issueStock: each row can't exceed its
 * rack's availableRoll/Yds, the rack must hold the same Item Code/PDM +
 * Color as the requisition item, and the TOTAL across all rows can't
 * exceed what's still remaining on the requisition item. The same rack
 * can't be picked twice in one batch (combine it into a single row
 * instead -- otherwise which row "wins" is ambiguous).
 */
export const issueStockBatch = async (req, res) => {
  try {
    const { requisitionItemId } = req.params;
    const { allocations } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ message: "Pick at least one rack to issue from" });
    }

    const rows = allocations.map((a) => ({
      allocationId: Number(a.allocationId),
      roll: Number(a.rollQty) || 0,
      yds: Number(a.yds) || 0,
    }));

    for (const r of rows) {
      if (!r.allocationId) return res.status(400).json({ message: "Every row needs a Rack selected" });
      if (r.roll <= 0 || r.yds <= 0) {
        return res.status(400).json({ message: "Every row needs both Roll and Yds greater than 0" });
      }
    }
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.allocationId)) {
        return res.status(400).json({ message: "The same rack was picked twice -- combine it into a single row" });
      }
      seen.add(r.allocationId);
    }

    const [reqItem] = await db.select().from(cuttingRequisitionItems).where(eq(cuttingRequisitionItems.id, requisitionItemId));
    if (!reqItem) return res.status(404).json({ message: "Requisition item not found" });
    if (reqItem.status === "fulfilled") {
      return res.status(400).json({ message: "This requisition item is already fully issued" });
    }

    const totalRoll = rows.reduce((s, r) => s + r.roll, 0);
    const totalYds = rows.reduce((s, r) => s + r.yds, 0);
    const remainingRoll = Number(reqItem.requestedRoll) - Number(reqItem.issuedRoll);
    const remainingYds = Number(reqItem.requestedYds) - Number(reqItem.issuedYds);
    if (totalRoll > remainingRoll || totalYds > remainingYds) {
      return res.status(400).json({ message: `Only ${remainingRoll} Roll / ${remainingYds} Yds remain to be issued in total` });
    }

    const allocationIds = rows.map((r) => r.allocationId);
    const allocs = await db
      .select()
      .from(materialReceiveItemLocations)
      .where(inArray(materialReceiveItemLocations.id, allocationIds));
    const allocById = new Map(allocs.map((a) => [a.id, a]));

    for (const r of rows) {
      const alloc = allocById.get(r.allocationId);
      if (!alloc) return res.status(404).json({ message: `Rack allocation ${r.allocationId} not found` });
      if (r.roll > Number(alloc.availableRoll) || r.yds > Number(alloc.availableYds)) {
        return res.status(400).json({
          message: `Only ${alloc.availableRoll} Roll / ${alloc.availableYds} Yds available on ${alloc.location}`,
        });
      }
    }

    // Sanity check every picked rack actually holds this Item Code/PDM + Color.
    const itemIds = [...new Set(allocs.map((a) => a.itemId))];
    const batches = itemIds.length
      ? await db.select().from(materialReceiveItems).where(inArray(materialReceiveItems.id, itemIds))
      : [];
    const batchById = new Map(batches.map((b) => [b.id, b]));
    for (const alloc of allocs) {
      const batch = batchById.get(alloc.itemId);
      if (!batch || batch.itemCodePdm !== reqItem.itemCodePdm || batch.color !== reqItem.color) {
        return res.status(400).json({ message: `Rack ${alloc.location} does not hold this Item Code/PDM + Color` });
      }
    }

    const [requisition] = await db
      .select()
      .from(cuttingRequisitions)
      .where(eq(cuttingRequisitions.id, reqItem.cuttingRequisitionId));

    await db.transaction(async (tx) => {
      for (const r of rows) {
        const alloc = allocById.get(r.allocationId);

        await tx
          .update(materialReceiveItemLocations)
          .set({
            availableRoll: Number(alloc.availableRoll) - r.roll,
            availableYds: Number(alloc.availableYds) - r.yds,
          })
          .where(eq(materialReceiveItemLocations.id, alloc.id));

        await tx.insert(cuttingIssues).values({
          requisitionItemId: Number(requisitionItemId),
          cuttingRequisitionId: reqItem.cuttingRequisitionId,
          allocationId: alloc.id,
          itemId: alloc.itemId,
          location: alloc.location,
          rollQty: r.roll,
          yds: r.yds,
        });

        await tx.insert(stockHistory).values({
          batchId: alloc.itemId,
          allocationId: alloc.id,
          materialReceiveId: alloc.materialReceiveId,
          action: "issue",
          location: alloc.location,
          rollQty: r.roll,
          yds: r.yds,
          note: `Issued ${r.roll} Roll / ${r.yds} Yds to Cutting (PO ${requisition?.po ?? ""}, Floor ${requisition?.floor ?? ""}) from ${alloc.location}`,
        });
      }

      await tx
        .update(cuttingRequisitionItems)
        .set({
          issuedRoll: Number(reqItem.issuedRoll) + totalRoll,
          issuedYds: Number(reqItem.issuedYds) + totalYds,
        })
        .where(eq(cuttingRequisitionItems.id, requisitionItemId));

      await recomputeRequisitionStatus(tx, Number(requisitionItemId));
    });

    const [updatedItem] = await db.select().from(cuttingRequisitionItems).where(eq(cuttingRequisitionItems.id, requisitionItemId));
    res.json(updatedItem);
  } catch (error) {
    console.error("issueStockBatch error:", error);
    res.status(500).json({ message: "Failed to issue stock" });
  }
};